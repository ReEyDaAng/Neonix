import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

/**
 * Public mini-profile — what other users see in search results, friend
 * lists, invitation lists. Never includes email/password.
 */
export interface PublicUserMini {
  id: string;
  displayName: string;
  username: string;
}

/**
 * Service for the social layer — friendships, server invitations, and
 * user search. Membership management for rooms lives on `ChatService`.
 */
@Injectable()
export class SocialService {
  /**
   * @param prisma data access
   * @param logger application logger
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Search users by displayName / username / email substring (case-insensitive).
   * Returns a small page sorted by displayName so the UX feels stable.
   *
   * @param requesterId current user (excluded from results)
   * @param query raw search input (≥2 chars)
   * @returns up to 20 mini-profiles
   */
  async searchUsers(
    requesterId: string,
    query: string,
  ): Promise<PublicUserMini[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: requesterId } },
          {
            OR: [
              { displayName: { contains: trimmed, mode: 'insensitive' } },
              { username: { contains: trimmed, mode: 'insensitive' } },
              { email: { contains: trimmed, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, displayName: true, username: true },
      orderBy: { displayName: 'asc' },
      take: 20,
    });
    return users;
  }

  /**
   * Send a friend request to a user identified by exact username or email.
   *
   * - If a reverse pending request already exists (`addressee->requester`),
   *   it is auto-accepted: both sides are now friends in one round trip.
   * - If a friendship already exists in any state, returns the existing row
   *   (idempotent — the UI just refreshes).
   *
   * @param requesterId actor
   * @param target identifier (exactly one of username/email)
   * @param target.username
   * @param target.email
   * @returns the resulting Friendship row
   */
  async sendFriendRequest(
    requesterId: string,
    target: { username?: string; email?: string },
  ) {
    if (!target.username && !target.email) {
      throw new BadRequestException('Either username or email is required');
    }

    const cleanedUsername = target.username?.trim().replace(/^@+/, '');
    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          cleanedUsername ? { username: `@${cleanedUsername}` } : undefined,
          cleanedUsername ? { username: cleanedUsername } : undefined,
          target.email ? { email: target.email.trim() } : undefined,
        ].filter(Boolean) as never,
      },
      select: { id: true, displayName: true, username: true },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (targetUser.id === requesterId) {
      throw new BadRequestException('Cannot add yourself as a friend');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      // Reverse pending → auto-accept.
      if (
        existing.status === 'PENDING' &&
        existing.requesterId === targetUser.id
      ) {
        const updated = await this.prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });
        this.logger.log('Friendship auto-accepted', 'SocialService', {
          friendshipId: updated.id,
        });
        return updated;
      }
      // Already friends or you've already sent a pending request.
      return existing;
    }

    const created = await this.prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: targetUser.id,
        status: 'PENDING',
      },
    });
    this.logger.log('Friend request created', 'SocialService', {
      friendshipId: created.id,
      from: requesterId,
      to: targetUser.id,
    });
    return created;
  }

  /**
   * Accept a pending friend request addressed to the current user.
   *
   * @param userId actor (must be the addressee)
   * @param friendshipId the row to accept
   * @returns updated Friendship row
   */
  async acceptFriendRequest(userId: string, friendshipId: string) {
    const f = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!f) throw new NotFoundException('Friend request not found');
    if (f.addresseeId !== userId)
      throw new ForbiddenException('Only the addressee can accept');
    if (f.status !== 'PENDING')
      throw new BadRequestException('Request is not pending');
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  /**
   * Decline (delete) a pending friend request addressed to the current user.
   *
   * @param userId actor (must be the addressee)
   * @param friendshipId the row to decline
   */
  async declineFriendRequest(userId: string, friendshipId: string) {
    const f = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!f) throw new NotFoundException('Friend request not found');
    if (f.addresseeId !== userId && f.requesterId !== userId)
      throw new ForbiddenException('Not your request');
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
  }

  /**
   * Remove an existing friend (works either side, simply deletes the row).
   *
   * @param userId actor
   * @param otherUserId user to unfriend
   */
  async removeFriend(userId: string, otherUserId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });
  }

  /**
   * List the user's friends and pending requests in one round trip.
   * Returns four buckets:
   *
   * - `friends` — accepted friendships, with the *other* user's mini-profile
   * - `incoming` — pending requests **for** this user
   * - `outgoing` — pending requests **from** this user
   *
   * @param userId actor
   */
  async listFriends(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, displayName: true, username: true } },
        addressee: { select: { id: true, displayName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const friends: Array<{ friendshipId: string; user: PublicUserMini }> = [];
    const incoming: Array<{
      friendshipId: string;
      user: PublicUserMini;
      createdAt: Date;
    }> = [];
    const outgoing: Array<{
      friendshipId: string;
      user: PublicUserMini;
      createdAt: Date;
    }> = [];

    for (const r of rows) {
      const other = r.requesterId === userId ? r.addressee : r.requester;
      if (r.status === 'ACCEPTED') {
        friends.push({ friendshipId: r.id, user: other });
      } else if (r.addresseeId === userId) {
        incoming.push({
          friendshipId: r.id,
          user: other,
          createdAt: r.createdAt,
        });
      } else {
        outgoing.push({
          friendshipId: r.id,
          user: other,
          createdAt: r.createdAt,
        });
      }
    }

    return { friends, incoming, outgoing };
  }

  /**
   * Invite another user to a server. The caller must be a member of the
   * room; the invitee must NOT already be a member, and there must be no
   * pending invitation for them in this room.
   *
   * @param roomId target server
   * @param inviterId actor (must be a member)
   * @param inviteeId user being invited
   * @returns created RoomInvitation row
   */
  async createInvitation(roomId: string, inviterId: string, inviteeId: string) {
    if (inviterId === inviteeId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    const inviterMember = await this.prisma.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: inviterId } },
    });
    if (!inviterMember) {
      throw new ForbiddenException('Only members can invite');
    }

    const inviteeMember = await this.prisma.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: inviteeId } },
    });
    if (inviteeMember) {
      throw new ConflictException('User is already a member');
    }

    const inviteeUser = await this.prisma.user.findUnique({
      where: { id: inviteeId },
      select: { id: true },
    });
    if (!inviteeUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.roomInvitation.findUnique({
      where: { roomId_inviteeId: { roomId, inviteeId } },
    });
    if (existing && existing.status === 'PENDING') {
      return existing;
    }
    if (existing) {
      // Resurrect a previously declined invitation as a fresh PENDING one.
      return this.prisma.roomInvitation.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          inviterId,
          createdAt: new Date(),
          respondedAt: null,
        },
      });
    }

    return this.prisma.roomInvitation.create({
      data: { roomId, inviterId, inviteeId },
    });
  }

  /**
   * List the current user's pending server invitations along with the
   * minimal room info needed to render the prompt (name, badge, inviter).
   *
   * @param userId actor
   */
  async listIncomingInvitations(userId: string) {
    return this.prisma.roomInvitation.findMany({
      where: { inviteeId: userId, status: 'PENDING' },
      include: {
        room: {
          select: { id: true, name: true, meta: true, badge: true },
        },
        inviter: {
          select: { id: true, displayName: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Accept a pending invitation: creates a `RoomMembership` row and marks
   * the invitation `ACCEPTED`. Idempotent — repeated calls are no-op.
   *
   * @param userId actor (must be the invitee)
   * @param invitationId target invitation
   * @returns the room id the user just joined
   */
  async acceptInvitation(userId: string, invitationId: string) {
    const inv = await this.prisma.roomInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.inviteeId !== userId)
      throw new ForbiddenException('Not your invitation');
    if (inv.status !== 'PENDING')
      throw new BadRequestException('Invitation already responded');

    await this.prisma.$transaction([
      this.prisma.roomMembership.upsert({
        where: { roomId_userId: { roomId: inv.roomId, userId } },
        update: {},
        create: { roomId: inv.roomId, userId },
      }),
      this.prisma.roomInvitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
    ]);

    return { roomId: inv.roomId };
  }

  /**
   * Decline a pending invitation.
   *
   * @param userId actor (must be the invitee)
   * @param invitationId target invitation
   */
  async declineInvitation(userId: string, invitationId: string) {
    const inv = await this.prisma.roomInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.inviteeId !== userId)
      throw new ForbiddenException('Not your invitation');
    if (inv.status !== 'PENDING')
      throw new BadRequestException('Invitation already responded');

    await this.prisma.roomInvitation.update({
      where: { id: invitationId },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });
  }

  /**
   * List the members of a room (used by the server-settings modal).
   *
   * @param roomId room
   * @returns array of mini-profiles
   */
  async listRoomMembers(roomId: string): Promise<PublicUserMini[]> {
    const rows = await this.prisma.roomMembership.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map((r) => r.user);
  }
}
