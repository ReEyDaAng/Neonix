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
import { CallsService } from './calls.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import {
  authenticateSocket,
  getSocketUserId,
  socketData,
} from '../../common/guards/ws-auth.helper';

type ChannelPayload = { channelId: string };
type GrantPayload = { channelId: string; targetUserId: string };
type ReactionPayload = { channelId: string; emoji: string };

/**
 * Socket.IO namespace `/calls` — owns the lightweight presence layer that sits
 * alongside LiveKit (raise-hand state, presenter handoff, ephemeral reactions).
 *
 * Heavy media + data channels remain on LiveKit; this gateway only handles
 * coordination signals that need to be authoritative on the Neonix backend.
 */
@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly raisedHandsByChannel = new Map<string, Set<string>>();

  /**
   * @param calls calls service
   * @param logger application logger
   */
  constructor(
    private readonly calls: CallsService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Authenticate the connecting socket; disconnect on invalid token.
   *
   * @param client connected socket
   */
  handleConnection(client: Socket): void {
    const userId = authenticateSocket(client);
    if (!userId) {
      this.logger.warn('Calls socket rejected: invalid token', 'CallsGateway', {
        socketId: client.id,
      });
      client.emit('auth:error', { message: 'Invalid token' });
      client.disconnect(true);
      return;
    }

    this.logger.log('Calls socket connected', 'CallsGateway', {
      socketId: client.id,
      userId,
    });
  }

  /**
   * Clean up presence state when a socket disconnects.
   *
   * @param client disconnecting socket
   */
  handleDisconnect(client: Socket): void {
    const userId = getSocketUserId(client);
    if (!userId) return;

    const channelId = socketData(client).callChannelId ?? null;
    if (channelId) {
      this.lowerHand(channelId, userId);
      this.broadcastPresenceUpdate(channelId);
    }

    this.logger.log('Calls socket disconnected', 'CallsGateway', {
      socketId: client.id,
      userId,
    });
  }

  /**
   * Subscribe a socket to call presence for a channel.
   * @param client
   * @param body
   */
  @SubscribeMessage('presence:join')
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ChannelPayload | undefined,
  ): { ok: boolean; error?: string } {
    const userId = getSocketUserId(client);
    if (!userId) return { ok: false, error: 'unauthenticated' };
    if (!body?.channelId) return { ok: false, error: 'channelId required' };

    void client.join(`call:${body.channelId}`);
    socketData(client).callChannelId = body.channelId;

    this.broadcastPresenceUpdate(body.channelId);
    return { ok: true };
  }

  /**
   * Remove a socket from call presence for a channel.
   * @param client
   * @param body
   */
  @SubscribeMessage('presence:leave')
  onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ChannelPayload | undefined,
  ): void {
    const userId = getSocketUserId(client);
    if (!userId || !body?.channelId) return;

    this.lowerHand(body.channelId, userId);
    void client.leave(`call:${body.channelId}`);
    const data = socketData(client);
    if (data.callChannelId === body.channelId) {
      delete data.callChannelId;
    }
    this.broadcastPresenceUpdate(body.channelId);
  }

  /**
   * Mark the user as raising their hand within a call.
   * @param client
   * @param body
   */
  @SubscribeMessage('hand:raise')
  onRaise(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ChannelPayload | undefined,
  ): void {
    const userId = getSocketUserId(client);
    if (!userId || !body?.channelId) return;

    const set = this.handsFor(body.channelId);
    if (!set.has(userId)) {
      set.add(userId);
      this.server
        .of('/calls')
        .to(`call:${body.channelId}`)
        .emit('hand:changed', { userId, raised: true });
    }
  }

  /**
   * Lower the user's hand within a call.
   * @param client
   * @param body
   */
  @SubscribeMessage('hand:lower')
  onLower(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ChannelPayload | undefined,
  ): void {
    const userId = getSocketUserId(client);
    if (!userId || !body?.channelId) return;
    this.lowerHand(body.channelId, userId);
  }

  /**
   * Transfer the presenter role from the caller to a target user.
   * @param client
   * @param body
   */
  @SubscribeMessage('presenter:grant')
  async onGrant(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: GrantPayload | undefined,
  ): Promise<{ ok: boolean; error?: string }> {
    const userId = getSocketUserId(client);
    if (!userId) return { ok: false, error: 'unauthenticated' };
    if (!body?.channelId || !body?.targetUserId) {
      return { ok: false, error: 'channelId and targetUserId required' };
    }

    try {
      const state = await this.calls.grantPresenter(
        body.channelId,
        userId,
        body.targetUserId,
      );

      // Lower the new presenter's hand if it was raised.
      this.lowerHand(body.channelId, body.targetUserId);

      this.server
        .of('/calls')
        .to(`call:${body.channelId}`)
        .emit('presenter:changed', {
          channelId: body.channelId,
          presenterUserId: state.presenterUserId,
        });

      return { ok: true };
    } catch (error) {
      this.logger.warn('Presenter grant rejected', 'CallsGateway', {
        userId,
        targetUserId: body.targetUserId,
        channelId: body.channelId,
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        ok: false,
        error: error instanceof Error ? error.message : 'failed to grant',
      };
    }
  }

  /**
   * Broadcast a transient emoji reaction to all participants in a call.
   * @param client
   * @param body
   */
  @SubscribeMessage('reaction:emit')
  onReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ReactionPayload | undefined,
  ): void {
    const userId = getSocketUserId(client);
    if (!userId || !body?.channelId || !body?.emoji) return;

    this.server
      .of('/calls')
      .to(`call:${body.channelId}`)
      .emit('reaction:received', {
        userId,
        emoji: body.emoji,
        at: Date.now(),
      });
  }

  /**
   * Drop a user from the raised-hand set for a channel and notify peers.
   *
   * @param channelId channel identifier
   * @param userId user dropping the hand
   */
  private lowerHand(channelId: string, userId: string): void {
    const set = this.raisedHandsByChannel.get(channelId);
    if (set?.delete(userId)) {
      this.server
        .of('/calls')
        .to(`call:${channelId}`)
        .emit('hand:changed', { userId, raised: false });
      if (set.size === 0) {
        this.raisedHandsByChannel.delete(channelId);
      }
    }
  }

  private handsFor(channelId: string): Set<string> {
    let set = this.raisedHandsByChannel.get(channelId);
    if (!set) {
      set = new Set();
      this.raisedHandsByChannel.set(channelId, set);
    }
    return set;
  }

  /**
   * Emit a fresh presence snapshot derived from LiveKit + DB to all peers.
   *
   * @param channelId channel identifier
   */
  private async broadcastPresenceUpdate(channelId: string): Promise<void> {
    try {
      const state = await this.calls.getState(channelId);
      this.server
        .of('/calls')
        .to(`call:${channelId}`)
        .emit('presence:update', { channelId, ...state });
    } catch (error) {
      this.logger.warn('Failed to broadcast presence update', 'CallsGateway', {
        channelId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
