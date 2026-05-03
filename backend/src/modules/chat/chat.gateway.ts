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
import { PrismaService } from '../prisma/prisma.service';
import {
  authenticateSocket,
  getSocketDisplayName,
  getSocketUserId,
  socketData,
} from '../../common/guards/ws-auth.helper';

type JoinPayload = {
  roomId: string;
  channelId?: string;
};

type TypingPayload = {
  roomId: string;
  channelId: string;
  typing: boolean;
};

type SendPayload = {
  roomId: string;
  channelId: string;
  text: string;
  time?: string;
};

type SavedMessage = {
  id: string;
  who: string;
  text: string;
  time: string;
  me: boolean;
  createdAt: Date;
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
 * - `connection` verifies the JWT supplied via `handshake.auth.token`
 *   (or `Authorization: Bearer …` header) and disconnects unauthenticated peers
 * - `join` subscribes a client to room/channel rooms
 * - `typing` broadcasts typing status using server-resolved display name
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
   * @param prisma Prisma service for resolving authenticated users
   */
  constructor(
    private readonly chat: ChatService,
    private readonly logger: AppLoggerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Triggered when a websocket client connects.
   *
   * @param client connected socket client
   */
  async handleConnection(client: Socket): Promise<void> {
    const userId = authenticateSocket(client);

    if (!userId) {
      this.logger.warn('Socket rejected: invalid token', 'ChatGateway', {
        socketId: client.id,
      });
      client.emit('auth:error', { message: 'Invalid token' });
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true, username: true },
      });

      if (!user) {
        this.logger.warn(
          'Socket rejected: user no longer exists',
          'ChatGateway',
          {
            socketId: client.id,
            userId,
          },
        );
        client.emit('auth:error', { message: 'User not found' });
        client.disconnect(true);
        return;
      }

      const data = socketData(client);
      data.displayName = user.displayName;
      data.username = user.username;
    } catch (error) {
      this.logger.error(
        'Socket rejected: failed to resolve user',
        error instanceof Error ? error.stack : undefined,
        'ChatGateway',
        { socketId: client.id, userId },
      );
      client.disconnect(true);
      return;
    }

    this.logger.log('Socket connected', 'ChatGateway', {
      socketId: client.id,
      userId,
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
      userId: getSocketUserId(client),
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
    if (!getSocketUserId(client)) {
      return { ok: false, error: 'unauthenticated' };
    }

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
      userId: getSocketUserId(client),
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
    const userId = getSocketUserId(client);
    if (!userId) return;

    const roomId = body?.roomId;
    const channelId = body?.channelId;
    const typing = body?.typing;
    const who = getSocketDisplayName(client);

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
      userId,
      roomId,
      channelId,
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
    const userId = getSocketUserId(client);
    if (!userId) {
      return { ok: false, error: 'unauthenticated' };
    }

    const roomId = body?.roomId;
    const channelId = body?.channelId;
    const rawText = body?.text;
    const trimmedText = rawText?.trim();
    const who = getSocketDisplayName(client);

    if (!roomId || !channelId || !trimmedText) {
      this.logger.warn('Message rejected: invalid payload', 'ChatGateway', {
        socketId: client.id,
        userId,
        roomId: roomId ?? null,
        channelId: channelId ?? null,
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
        who,
        trimmedText,
        time,
        userId,
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
        userId,
        roomId,
        channelId,
        who,
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
          userId,
          roomId: roomId ?? null,
          channelId: channelId ?? null,
        },
      );

      return {
        ok: false,
        error: 'failed to send message',
      };
    }
  }
}
