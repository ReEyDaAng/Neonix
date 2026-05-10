import { Injectable } from '@nestjs/common';
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
  async listRooms() {
    const start = performance.now();
    await this.ensureSeed();
    const result = this.prisma.room.findMany({ orderBy: { createdAt: 'asc' } });
    const duration = performance.now() - start;
    this.logger.debug('listRooms timing', 'ChatService', {
      durationMs: Math.round(duration),
    });
    return result;
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
