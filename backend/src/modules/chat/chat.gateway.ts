import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";

type JoinPayload = { roomId: string; channelId?: string };
type SendPayload = { roomId: string; channelId: string; who: string; text: string; time?: string };

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chat: ChatService) {}

  handleConnection(_client: Socket) {
    // connection established
  }

  handleDisconnect(_client: Socket) {
    // connection closed
  }

  @SubscribeMessage("join")
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const { roomId, channelId } = body || ({} as any);
    if (!roomId) return { ok: false, error: "roomId required" };

    // leave previous room/channel namespaces
    for (const r of client.rooms) {
      if (r !== client.id) client.leave(r);
    }

    client.join(`room:${roomId}`);
    if (channelId) client.join(`channel:${roomId}:${channelId}`);

    return { ok: true };
  }

  @SubscribeMessage("typing")
  onTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId: string; channelId: string; who: string; typing: boolean }) {
    const { roomId, channelId, who, typing } = body || ({} as any);
    if (!roomId || !channelId) return;
    client.to(`channel:${roomId}:${channelId}`).emit("typing", { who, typing });
  }

  @SubscribeMessage("message")
  async onMessage(@ConnectedSocket() client: Socket, @MessageBody() body: SendPayload) {
    const { roomId, channelId, who, text } = body || ({} as any);
    if (!roomId || !channelId || !text?.trim()) return { ok: false, error: "invalid payload" };

    const time = body.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msg = await this.chat.sendMessage(roomId, channelId, who || "User", text.trim(), time);

    // broadcast to channel listeners
    this.server.to(`channel:${roomId}:${channelId}`).emit("message", msg);
    // also to room listeners (for unread badges)
    this.server.to(`room:${roomId}`).emit("roomMessage", { roomId, channelId, messageId: msg.id, time: msg.time });

    // ack to sender
    return { ok: true, message: msg };
  }
}
