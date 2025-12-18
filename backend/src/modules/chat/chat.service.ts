import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // Запуститься автоматично при першому зверненні, якщо таблиці порожні
  async ensureSeed() {
    const roomsCount = await this.prisma.room.count();
    if (roomsCount > 0) return;

    const room1 = await this.prisma.room.create({
      data: { name: "Neonix — Main", meta: "General • announcements", badge: "NX" }
    });

    const room2 = await this.prisma.room.create({
      data: { name: "Study Session", meta: "Whiteboard • host tools", badge: "SS" }
    });

    await this.prisma.channel.createMany({
      data: [
        { roomId: room1.id, name: "general" },
        { roomId: room1.id, name: "whiteboard" },
        { roomId: room1.id, name: "admin" },
        { roomId: room2.id, name: "session" },
        { roomId: room2.id, name: "tasks" }
      ]
    });

    await this.prisma.message.create({
      data: {
        roomId: room1.id,
        channelId: (await this.prisma.channel.findFirst({ where: { roomId: room1.id, name: "general" } }))!.id,
        who: "Roma",
        text: "Can we enable drawing on the screen for everyone?",
        time: "13:01",
        me: false
      }
    });
  }

  async listRooms() {
    await this.ensureSeed();
    return this.prisma.room.findMany({ orderBy: { createdAt: "asc" } });
  }

  async listChannels(roomId: string) {
    await this.ensureSeed();
    return this.prisma.channel.findMany({ where: { roomId }, orderBy: { createdAt: "asc" } });
  }

  async listMessages(roomId: string, channelId: string) {
    await this.ensureSeed();
    return this.prisma.message.findMany({
      where: { roomId, channelId },
      orderBy: { createdAt: "asc" }
    });
  }

  async sendMessage(roomId: string, channelId: string, who: string, text: string, time: string) {
    await this.ensureSeed();
    return this.prisma.message.create({
      data: { roomId, channelId, who, text, time, me: true }
    });
  }
}
