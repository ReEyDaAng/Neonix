import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

type JoinPayload = { roomId: string; channelId?: string };
type SendPayload = {
  roomId: string;
  channelId: string;
  who: string;
  text: string;
  time?: string;
};

/**
 * Socket.IO gateway for real-time chat events.
 *
 * Connection flow:
 * - `connection` event opens socket.
 * - `join` subscribes a client to room/channel rooms.
 * - `typing` broadcasts typing status.
 * - `message` saves and broadcasts messages to room/channel.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /**
   *
   * @param chat
   */
  constructor(private readonly chat: ChatService) {}

  /**
   * Triggered when a websocket client connects.
   */
  handleConnection() {
    // connection established
  }

  /**
   * Triggered when a websocket client disconnects.
   */
  handleDisconnect() {
    // connection closed
  }

  /**
   * Request to join a room and optional channel group.
   * @param client - connected socket client
   * @param body - { roomId, channelId? }
   * @returns acknowledgment object
   */
  @SubscribeMessage('join')
  onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const { roomId, channelId } = body || ({} as any);
    if (!roomId) return { ok: false, error: 'roomId required' };

    // leave previous room/channel namespaces
    for (const r of client.rooms) {
      if (r !== client.id) (client.leave as (room: string) => void)(r);
    }

    (client.join as (room: string) => void)(`room:${roomId}`);
    if (channelId)
      (client.join as (room: string) => void)(`channel:${roomId}:${channelId}`);

    return { ok: true };
  }

  /**
   * Broadcast typing state to channel peers.
   * @param client
   * @param body
   * @param body.roomId
   * @param body.channelId
   * @param body.who
   * @param body.typing
   */
  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { roomId: string; channelId: string; who: string; typing: boolean },
  ) {
    const { roomId, channelId, who, typing } = body || ({} as any);
    if (!roomId || !channelId) return;

    (
      client.to(`channel:${roomId}:${channelId}`).emit as (
        event: string,
        data: any,
      ) => void
    )('typing', { who, typing });
  }

  /**
   * Handle incoming chat message, persist it, and broadcast updates.
   *
   * @param client - current socket connection
   * @param body - message payload payload
   * @returns acknowledgment with saved message
   */
  @SubscribeMessage('message')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendPayload,
  ) {
    const { roomId, channelId, who, text } = body || ({} as any);
    if (!roomId || !channelId || !text?.trim())
      return { ok: false, error: 'invalid payload' };

    const time =
      body.time ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = await this.chat.sendMessage(
      roomId,
      channelId,
      who || 'User',
      text.trim(),
      time,
    );

    // broadcast to channel listeners

    (
      this.server.to(`channel:${roomId}:${channelId}`).emit as (
        event: string,
        data: any,
      ) => void
    )('message', msg);

    // also to room listeners (for unread badges)

    (
      this.server.to(`room:${roomId}`).emit as (
        event: string,
        data: any,
      ) => void
    )('roomMessage', {
      roomId,
      channelId,
      messageId: msg.id,
      time: msg.time,
    });

    // ack to sender
    return { ok: true, message: msg };
  }
}
