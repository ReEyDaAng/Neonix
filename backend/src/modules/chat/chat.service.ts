import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

/**
 * Service that manages room, channel, and message data through Prisma.
 *
 * Ensures initial seed data exists and provides CRUD listing/send operations.
 */
@Injectable()
export class ChatService {
  /**
   * Constructor for ChatService.
   * @param prisma Prisma service instance
   * @param logger Application logger
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Seed default rooms, channels, and sample message when database empty.
   *
   * @remarks
   * This method is idempotent and is invoked by public list endpoints.
   */
  async ensureSeed() {
    const roomsCount = await this.prisma.room.count();
    if (roomsCount > 0) return;

    const room1 = await this.prisma.room.create({
      data: {
        name: 'Neonix — Main',
        meta: 'General • announcements',
        badge: 'NX',
      },
    });

    const room2 = await this.prisma.room.create({
      data: {
        name: 'Study Session',
        meta: 'Whiteboard • host tools',
        badge: 'SS',
      },
    });

    await this.prisma.channel.createMany({
      data: [
        { roomId: room1.id, name: 'general', kind: 'TEXT' },
        { roomId: room1.id, name: 'whiteboard', kind: 'TEXT' },
        { roomId: room1.id, name: 'voice-lounge', kind: 'VOICE' },
        { roomId: room1.id, name: 'demo-room', kind: 'VIDEO' },
        { roomId: room1.id, name: 'admin', kind: 'TEXT' },
        { roomId: room2.id, name: 'session', kind: 'TEXT' },
        { roomId: room2.id, name: 'tasks', kind: 'TEXT' },
        { roomId: room2.id, name: 'lecture-room', kind: 'VIDEO' },
        { roomId: room2.id, name: 'quiet-voice', kind: 'VOICE' },
      ],
    });

    await this.prisma.message.create({
      data: {
        roomId: room1.id,
        channelId: (await this.prisma.channel.findFirst({
          where: { roomId: room1.id, name: 'general' },
        }))!.id,
        who: 'Roma',
        text: 'Can we enable drawing on the screen for everyone?',
        time: '13:01',
        me: false,
      },
    });
  }

  /**
   * List all rooms in creation order.
   *
   * @returns rooms array
   */
  /**
   * Legacy listing — all rooms in the database. Kept only for the seed flow
   * (admin tools / tests) and not exposed by the controller.
   */
  async listAllRooms() {
    await this.ensureSeed();
    return this.prisma.room.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /**
   * Membership-aware listing: returns only the rooms the user belongs to.
   * The seed runs on first call so a brand-new database still produces
   * sample rooms — those rooms get auto-membership for the seed user
   * lazily on first access (see {@link ensureSeedMembership}).
   *
   * @param userId authenticated user id
   * @returns rooms the user is a member of, ordered oldest-first
   */
  async listRoomsForUser(userId: string) {
    const start = performance.now();
    await this.ensureSeed();
    await this.ensureSeedMembership(userId);
    const result = await this.prisma.room.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
    });
    const duration = performance.now() - start;
    this.logger.debug('listRoomsForUser timing', 'ChatService', {
      userId,
      count: result.length,
      durationMs: Math.round(duration),
    });
    return result;
  }

  /**
   * Throws if the user is not a member of the given room.
   *
   * @param userId actor
   * @param roomId target room
   * @throws ForbiddenException when membership row is missing
   */
  async assertMembership(userId: string, roomId: string): Promise<void> {
    const m = await this.prisma.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!m) {
      throw new ForbiddenException('You are not a member of this server');
    }
  }

  /**
   * Quick boolean check that does not throw.
   *
   * @param userId actor
   * @param roomId target room
   * @returns whether the user is a member
   */
  async isMember(userId: string, roomId: string): Promise<boolean> {
    const m = await this.prisma.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return Boolean(m);
  }

  /**
   * Idempotently grant membership in every existing seed room to a brand-new
   * user. Without this, fresh accounts would land in the chat with zero
   * visible servers and no obvious next step. The "seed" rooms are detected
   * by their lack of an owner (created via `ensureSeed`).
   *
   * @param userId user that just signed in for the first time
   */
  private async ensureSeedMembership(userId: string): Promise<void> {
    const seedRooms = await this.prisma.room.findMany({
      where: { ownerId: null },
      select: { id: true },
    });
    if (seedRooms.length === 0) return;
    await this.prisma.roomMembership.createMany({
      data: seedRooms.map((r) => ({ roomId: r.id, userId })),
      skipDuplicates: true,
    });
  }

  /**
   * Resolve a room with its owner mini-profile, used by the server-settings
   * modal on the frontend to decide which buttons to render.
   *
   * @param roomId target room
   * @returns room with embedded owner shape `{ id, displayName, username }`
   *   or null when room does not exist
   */
  async getRoomWithOwner(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });
  }

  /**
   * Quick check used by permission-sensitive operations
   * (currently only "clear all annotations").
   *
   * @param userId actor
   * @param roomId target room
   * @returns true if the user owns the room
   */
  async isRoomOwner(userId: string, roomId: string): Promise<boolean> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { ownerId: true },
    });
    return Boolean(room?.ownerId && room.ownerId === userId);
  }

  /**
   * List channels for a specified room.
   *
   * @param roomId - room identifier
   * @returns channels array
   */
  async listChannels(roomId: string) {
    const start = performance.now();
    await this.ensureSeed();
    const result = this.prisma.channel.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
    const duration = performance.now() - start;
    this.logger.debug('listChannels timing', 'ChatService', {
      roomId,
      durationMs: Math.round(duration),
    });
    return result;
  }

  /**
   * List messages in a channel with room/channel scope.
   *
   * @param roomId - room identifier
   * @param channelId - channel identifier
   * @param limit - optional limit for pagination (default 50)
   * @returns messages array
   */
  async listMessages(roomId: string, channelId: string, limit: number = 50) {
    const start = performance.now();
    await this.ensureSeed();
    const result = this.prisma.message.findMany({
      where: { roomId, channelId },
      select: {
        id: true,
        who: true,
        text: true,
        time: true,
        me: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    const duration = performance.now() - start;
    this.logger.debug('listMessages timing', 'ChatService', {
      roomId,
      channelId,
      durationMs: Math.round(duration),
    });
    return result;
  }

  /**
   * Append a new message in a channel.
   *
   * @param roomId - room identifier
   * @param channelId - channel identifier
   * @param who - sender display name
   * @param text - message body
   * @param time - message time label
   * @param userId
   * @returns created message record
   */
  /**
   * Create a new room (server) plus a default "general" text channel so
   * the user has somewhere to land after joining.
   *
   * @param name room display name
   * @param meta optional tagline shown under the name
   * @param badge optional 1-3 char badge text
   * @param ownerId
   * @returns created room (with empty channels array — UI will refetch)
   */
  async createRoom(
    name: string,
    meta?: string,
    badge?: string,
    ownerId?: string | null,
  ) {
    const trimmedName = name.trim();
    const trimmedMeta = meta?.trim() || 'New room';
    const trimmedBadge =
      (badge?.trim() || trimmedName.slice(0, 2)).toUpperCase().slice(0, 3) ||
      'NX';

    const room = await this.prisma.room.create({
      data: {
        name: trimmedName,
        meta: trimmedMeta,
        badge: trimmedBadge,
        ownerId: ownerId ?? null,
      },
    });

    // Seed a default text channel so the new room is immediately usable.
    await this.prisma.channel.create({
      data: { roomId: room.id, name: 'general', kind: 'TEXT' },
    });

    // Auto-grant membership to the creator — without this they would create
    // a server they could not see (because room listings are now membership-
    // filtered).
    if (ownerId) {
      await this.prisma.roomMembership.create({
        data: { roomId: room.id, userId: ownerId },
      });
    }

    this.logger.log('Room created', 'ChatService', {
      roomId: room.id,
      name: room.name,
    });

    return room;
  }

  /**
   * Create a new channel inside an existing room.
   *
   * Channel names are slugified to lowercase kebab-case so that the URL-style
   * "#" presentation is consistent across servers. The DB enforces
   * `@@unique([roomId, name])` so a duplicate slug raises a P2002.
   *
   * @param roomId target room id
   * @param rawName raw channel name from user input
   * @param kind channel kind (TEXT/VOICE/VIDEO)
   * @returns created channel
   * @throws NotFoundException when room does not exist
   * @throws BadRequestException when name slug is empty or already taken
   */
  async createChannel(
    roomId: string,
    rawName: string,
    kind: 'TEXT' | 'VOICE' | 'VIDEO',
  ) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const slug = rawName
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    if (!slug) {
      throw new BadRequestException(
        'Channel name must contain at least one alphanumeric character',
      );
    }

    const existing = await this.prisma.channel.findFirst({
      where: { roomId, name: slug },
    });
    if (existing) {
      throw new BadRequestException(
        `Channel "${slug}" already exists in this room`,
      );
    }

    const channel = await this.prisma.channel.create({
      data: { roomId, name: slug, kind },
    });

    this.logger.log('Channel created', 'ChatService', {
      roomId,
      channelId: channel.id,
      kind,
      name: slug,
    });

    return channel;
  }

  /**
   *
   * @param roomId
   * @param channelId
   * @param who
   * @param text
   * @param time
   * @param userId
   */
  async sendMessage(
    roomId: string,
    channelId: string,
    who: string,
    text: string,
    time: string,
    userId?: string | null,
  ) {
    const start = performance.now();
    await this.ensureSeed();
    const result = this.prisma.message.create({
      data: {
        roomId,
        channelId,
        who,
        text,
        time,
        me: true,
        userId: userId ?? null,
      },
    });
    const duration = performance.now() - start;
    this.logger.debug('sendMessage timing', 'ChatService', {
      roomId,
      channelId,
      durationMs: Math.round(duration),
    });
    return result;
  }
}
