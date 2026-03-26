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
import { AppLoggerService } from '../../common/logger/logger.service';

type JoinPayload = {
  roomId: string;
  channelId?: string;
};

type TypingPayload = {
  roomId: string;
  channelId: string;
  who: string;
  typing: boolean;
};

type SendPayload = {
  roomId: string;
  channelId: string;
  who: string;
  text: string;
  time?: string;
};

type SavedMessage = {
  id: string;
  time: string;
};

type RoomMessageEvent = {
  roomId: string;
  channelId: string;
  messageId: string;
  time: string;
};

/**
 * Socket.IO gateway for real-time chat events.
 *
 * Connection flow:
 * - `connection` event opens socket
 * - `join` subscribes a client to room/channel rooms
 * - `typing` broadcasts typing status
 * - `message` saves and broadcasts messages to room/channel
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
   * @param chat chat service
   * @param logger application logger
   */
  constructor(
    private readonly chat: ChatService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Triggered when a websocket client connects.
   *
   * @param client connected socket client
   */
  handleConnection(client: Socket): void {
    this.logger.log('Socket connected', 'ChatGateway', {
      socketId: client.id,
    });
  }

  /**
   * Triggered when a websocket client disconnects.
   *
   * @param client disconnected socket client
   */
  handleDisconnect(client: Socket): void {
    this.logger.log('Socket disconnected', 'ChatGateway', {
      socketId: client.id,
    });
  }

  /**
   * Request to join a room and optional channel group.
   *
   * @param client connected socket client
   * @param body join payload
   * @returns acknowledgment object
   */
  @SubscribeMessage('join')
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinPayload | undefined,
  ): { ok: boolean; error?: string } {
    const roomId = body?.roomId;
    const channelId = body?.channelId;

    if (!roomId) {
      this.logger.warn('Join failed: roomId missing', 'ChatGateway', {
        socketId: client.id,
        channelId: channelId ?? null,
      });

      return { ok: false, error: 'roomId required' };
    }

    for (const room of client.rooms) {
      if (room !== client.id) {
        void client.leave(room);
      }
    }

    void client.join(`room:${roomId}`);

    if (channelId) {
      void client.join(`channel:${roomId}:${channelId}`);
    }

    this.logger.log('Socket joined room/channel', 'ChatGateway', {
      socketId: client.id,
      roomId,
      channelId: channelId ?? null,
    });

    return { ok: true };
  }

  /**
   * Broadcast typing state to channel peers.
   *
   * @param client connected socket client
   * @param body typing payload
   */
  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TypingPayload | undefined,
  ): void {
    const roomId = body?.roomId;
    const channelId = body?.channelId;
    const who = body?.who;
    const typing = body?.typing;

    if (!roomId || !channelId) {
      this.logger.warn('Typing event ignored: invalid payload', 'ChatGateway', {
        socketId: client.id,
        roomId: roomId ?? null,
        channelId: channelId ?? null,
      });

      return;
    }

    client.to(`channel:${roomId}:${channelId}`).emit('typing', {
      who,
      typing,
    });

    this.logger.debug('Typing event broadcasted', 'ChatGateway', {
      socketId: client.id,
      roomId,
      channelId,
      who: who ?? null,
      typing: typing ?? null,
    });
  }

  /**
   * Handle incoming chat message, persist it, and broadcast updates.
   *
   * @param client current socket connection
   * @param body message payload
   * @returns acknowledgment with saved message
   */
  @SubscribeMessage('message')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendPayload | undefined,
  ): Promise<{ ok: boolean; error?: string; message?: SavedMessage }> {
    const roomId = body?.roomId;
    const channelId = body?.channelId;
    const who = body?.who;
    const rawText = body?.text;
    const trimmedText = rawText?.trim();

    if (!roomId || !channelId || !trimmedText) {
      this.logger.warn('Message rejected: invalid payload', 'ChatGateway', {
        socketId: client.id,
        roomId: roomId ?? null,
        channelId: channelId ?? null,
        who: who ?? null,
      });

      return { ok: false, error: 'invalid payload' };
    }

    try {
      const time =
        body?.time ||
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

      const msg = (await this.chat.sendMessage(
        roomId,
        channelId,
        who || 'User',
        trimmedText,
        time,
      )) as SavedMessage;

      this.server.to(`channel:${roomId}:${channelId}`).emit('message', msg);

      const roomEvent: RoomMessageEvent = {
        roomId,
        channelId,
        messageId: msg.id,
        time: msg.time,
      };

      this.server.to(`room:${roomId}`).emit('roomMessage', roomEvent);

      this.logger.log('Message sent successfully', 'ChatGateway', {
        socketId: client.id,
        roomId,
        channelId,
        who: who || 'User',
        messageId: msg.id,
      });

      return { ok: true, message: msg };
    } catch (error) {
      this.logger.error(
        'Failed to process chat message',
        error instanceof Error ? error.stack : undefined,
        'ChatGateway',
        {
          socketId: client.id,
          roomId: roomId ?? null,
          channelId: channelId ?? null,
          who: who ?? null,
        },
      );

      return {
        ok: false,
        error: 'failed to send message',
      };
    }
  }
}
