import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

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
   */
  constructor(private readonly prisma: PrismaService) {}

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
        { roomId: room1.id, name: 'general' },
        { roomId: room1.id, name: 'whiteboard' },
        { roomId: room1.id, name: 'admin' },
        { roomId: room2.id, name: 'session' },
        { roomId: room2.id, name: 'tasks' },
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
    await this.ensureSeed();
    return this.prisma.room.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /**
   * List channels for a specified room.
   *
   * @param roomId - room identifier
   * @returns channels array
   */
  async listChannels(roomId: string) {
    await this.ensureSeed();
    return this.prisma.channel.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * List messages in a channel with room/channel scope.
   *
   * @param roomId - room identifier
   * @param channelId - channel identifier
   * @returns messages array
   */
  async listMessages(roomId: string, channelId: string) {
    await this.ensureSeed();
    return this.prisma.message.findMany({
      where: { roomId, channelId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Append a new message in a channel.
   *
   * @param roomId - room identifier
   * @param channelId - channel identifier
   * @param who - sender display name
   * @param text - message body
   * @param time - message time label
   * @returns created message record
   */
  async sendMessage(
    roomId: string,
    channelId: string,
    who: string,
    text: string,
    time: string,
  ) {
    await this.ensureSeed();
    return this.prisma.message.create({
      data: { roomId, channelId, who, text, time, me: true },
    });
  }
}
