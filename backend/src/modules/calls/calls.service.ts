import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

/**
 * Result of issuing a LiveKit access token.
 */
export interface IssuedToken {
  token: string;
  url: string;
  roomName: string;
  expiresAt: number;
}

/**
 * Public state of an active call session, derived from LiveKit + DB.
 */
export interface CallStateSnapshot {
  presenterUserId: string | null;
  raisedHands: string[];
  participantsCount: number;
}

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Service that owns LiveKit token issuance, call session bookkeeping, and
 * presenter-state mutations. Wraps the LiveKit Server SDK and exposes a
 * narrower domain-shaped API for the rest of the application.
 */
@Injectable()
export class CallsService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly publicUrl: string;
  private readonly httpUrl: string;
  private readonly roomService: RoomServiceClient | null;

  /**
   * @param prisma Prisma data access
   * @param logger application logger
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.apiKey = process.env.LIVEKIT_API_KEY || '';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || '';
    this.publicUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
    // RoomServiceClient expects an http(s) URL, while clients use ws(s)://.
    this.httpUrl =
      process.env.LIVEKIT_HTTP_URL || this.publicUrl.replace(/^ws/, 'http');

    if (this.apiKey && this.apiSecret) {
      this.roomService = new RoomServiceClient(
        this.httpUrl,
        this.apiKey,
        this.apiSecret,
      );
    } else {
      this.roomService = null;
      this.logger.warn(
        'LiveKit credentials missing — calls module will refuse to issue tokens',
        'CallsService',
      );
    }
  }

  /**
   * Issue a LiveKit access token for the given user/channel pair.
   *
   * Verifies that the channel exists and is a media channel (VOICE or VIDEO),
   * then mints a LiveKit JWT with a 1 hour TTL. Identity is set to the user id
   * so that backend-side presenter checks can correlate participants.
   *
   * @param userId authenticated user id
   * @param channelId target channel id
   * @returns LiveKit access token + connection URL
   * @throws NotFoundException when channel does not exist
   * @throws BadRequestException when channel is a TEXT channel
   */
  async issueToken(userId: string, channelId: string): Promise<IssuedToken> {
    if (!this.apiKey || !this.apiSecret) {
      throw new BadRequestException(
        'LiveKit is not configured on this deployment',
      );
    }

    const [channel, user] = await Promise.all([
      this.prisma.channel.findUnique({ where: { id: channelId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true, username: true },
      }),
    ]);

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    if (channel.kind === 'TEXT') {
      throw new BadRequestException('This channel does not support calls');
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roomName = `ch_${channelId}`;

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user.id,
      name: user.displayName,
      ttl: TOKEN_TTL_SECONDS,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Ensure a CallSession row exists for diagnostics / presenter tracking.
    const existing = await this.prisma.callSession.findFirst({
      where: { channelId, livekitRoom: roomName, endedAt: null },
    });
    if (!existing) {
      await this.prisma.callSession.create({
        data: { channelId, livekitRoom: roomName },
      });
    }

    const token = await at.toJwt();
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

    this.logger.log('LiveKit token issued', 'CallsService', {
      userId,
      channelId,
      roomName,
      expiresAt,
    });

    return {
      token,
      url: this.publicUrl,
      roomName,
      expiresAt,
    };
  }

  /**
   * Resolve the current state of a call (presenter, hands, participant count)
   * from LiveKit RoomService and the latest CallSession row.
   *
   * @param channelId channel identifier
   * @returns call state snapshot; defaults applied when room does not exist
   */
  async getState(channelId: string): Promise<CallStateSnapshot> {
    const roomName = `ch_${channelId}`;
    const session = await this.prisma.callSession.findFirst({
      where: { channelId, livekitRoom: roomName },
      orderBy: { startedAt: 'desc' },
    });

    let participantsCount = 0;
    let raisedHands: string[] = [];

    if (this.roomService) {
      try {
        const participants = await this.roomService.listParticipants(roomName);
        participantsCount = participants.length;
        raisedHands = participants
          .filter((p) => {
            const meta = p.metadata ? safeJson(p.metadata) : null;
            return Boolean(
              meta && (meta as { raisedHand?: boolean }).raisedHand,
            );
          })
          .map((p) => p.identity);
      } catch (error) {
        // Room may not yet exist if no one has joined. That's fine.
        this.logger.debug(
          'LiveKit listParticipants failed (room likely empty)',
          'CallsService',
          {
            channelId,
            message: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    return {
      presenterUserId: session?.presenterUserId ?? null,
      raisedHands,
      participantsCount,
    };
  }

  /**
   * Atomically transfer the presenter role to another participant.
   *
   * @param channelId channel id
   * @param callerUserId user issuing the request
   * @param targetUserId user becoming the new presenter
   * @returns updated call state snapshot
   * @throws ForbiddenException when caller is not the current presenter
   */
  async grantPresenter(
    channelId: string,
    callerUserId: string,
    targetUserId: string,
  ): Promise<CallStateSnapshot> {
    const roomName = `ch_${channelId}`;
    const session = await this.prisma.callSession.findFirst({
      where: { channelId, livekitRoom: roomName },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      throw new NotFoundException('Active call not found for this channel');
    }

    // Atomic conditional update — only succeeds if the presenter is currently
    // null (first claim) OR equal to the caller (transfer). This closes the
    // race where two simultaneous grants could both pass an in-memory check.
    const updated = await this.prisma.callSession.updateMany({
      where: {
        id: session.id,
        OR: [{ presenterUserId: null }, { presenterUserId: callerUserId }],
      },
      data: { presenterUserId: targetUserId },
    });

    if (updated.count === 0) {
      throw new ForbiddenException(
        'Only the current presenter can transfer control',
      );
    }

    if (this.roomService) {
      try {
        await this.roomService.updateRoomMetadata(
          roomName,
          JSON.stringify({ presenterUserId: targetUserId }),
        );
      } catch (error) {
        this.logger.warn(
          'Failed to write LiveKit room metadata; presenter set in DB only',
          'CallsService',
          {
            channelId,
            message: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logger.log('Presenter transferred', 'CallsService', {
      channelId,
      callerUserId,
      targetUserId,
    });

    return this.getState(channelId);
  }

  /**
   * Persist an annotation snapshot for a channel.
   *
   * @param channelId channel identifier
   * @param userId author identifier (or null for anonymous edits)
   * @param payload opaque snapshot payload
   * @returns persisted record id and createdAt
   */
  async saveAnnotation(
    channelId: string,
    userId: string | null,
    payload: Record<string, unknown>,
  ) {
    // Bound payload size — guards against single-request DoS and unbounded
    // database growth. 256 KB is generous for thousands of stroke deltas.
    const serialized = JSON.stringify(payload);
    if (serialized.length > 256 * 1024) {
      throw new BadRequestException(
        'Annotation payload too large (max 256 KB)',
      );
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Require an active call session — only call participants should write.
    const session = await this.prisma.callSession.findFirst({
      where: { channelId, livekitRoom: `ch_${channelId}`, endedAt: null },
    });
    if (!session) {
      throw new NotFoundException('No active call for this channel');
    }

    const created = await this.prisma.annotation.create({
      data: {
        channelId,
        userId: userId ?? null,
        payload: payload as never,
      },
      select: { id: true, createdAt: true },
    });

    return created;
  }

  /**
   * Return the most recent annotation snapshot for a channel.
   *
   * @param channelId channel identifier
   * @returns latest annotation row or null
   */
  async latestAnnotation(channelId: string) {
    return this.prisma.annotation.findFirst({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

function safeJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
