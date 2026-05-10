import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SocialService } from './social.service';
import { CreateFriendRequestDto, CreateInvitationDto } from './dto';

/**
 * REST controller for the social subsystem: friends, invitations, user
 * search, and room members. All routes require a Bearer JWT.
 */
@ApiTags('Social')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SocialController {
  /**
   * @param social social service
   */
  constructor(private readonly social: SocialService) {}

  /**
   * Search users by displayName/username/email (≥2 chars).
   *
   * @param q query string
   * @param req authenticated request
   * @returns up to 20 mini-profiles
   */
  @Get('users/search')
  @ApiOperation({ summary: 'Search users (excluding self)' })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(@Query('q') q: string, @Req() req: Request) {
    const userId = this.requireUserId(req);
    return this.social.searchUsers(userId, q || '');
  }

  /**
   * Send a friend request by username or email.
   *
   * @param dto target identifier
   * @param req authenticated request
   * @returns created friendship row
   */
  @Post('me/friends/requests')
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiResponse({
    status: 201,
    description: 'Friend request created (or auto-accepted)',
  })
  sendFriendRequest(@Body() dto: CreateFriendRequestDto, @Req() req: Request) {
    const userId = this.requireUserId(req);
    return this.social.sendFriendRequest(userId, {
      username: dto.username,
      email: dto.email,
    });
  }

  /**
   * List my friends and pending requests in one go.
   *
   * @param req authenticated request
   * @returns `{ friends, incoming, outgoing }`
   */
  @Get('me/friends')
  @ApiOperation({ summary: 'List friends + pending requests' })
  @ApiResponse({ status: 200, description: 'Friends snapshot' })
  listFriends(@Req() req: Request) {
    const userId = this.requireUserId(req);
    return this.social.listFriends(userId);
  }

  /**
   * Accept a pending friend request.
   *
   * @param friendshipId target row
   * @param req authenticated request
   */
  @Post('me/friends/requests/:friendshipId/accept')
  @ApiOperation({ summary: 'Accept a friend request' })
  @ApiResponse({ status: 201, description: 'Accepted' })
  acceptFriendRequest(
    @Param('friendshipId') friendshipId: string,
    @Req() req: Request,
  ) {
    const userId = this.requireUserId(req);
    return this.social.acceptFriendRequest(userId, friendshipId);
  }

  /**
   * Decline a pending friend request (deletes it).
   *
   * @param friendshipId target row
   * @param req authenticated request
   */
  @Post('me/friends/requests/:friendshipId/decline')
  @ApiOperation({ summary: 'Decline a friend request' })
  @ApiResponse({ status: 200, description: 'Declined' })
  async declineFriendRequest(
    @Param('friendshipId') friendshipId: string,
    @Req() req: Request,
  ) {
    const userId = this.requireUserId(req);
    await this.social.declineFriendRequest(userId, friendshipId);
    return { ok: true };
  }

  /**
   * Remove an existing friend.
   *
   * @param userId target user
   * @param otherUserId
   * @param req authenticated request
   */
  @Delete('me/friends/:userId')
  @ApiOperation({ summary: 'Remove a friend' })
  @ApiResponse({ status: 200, description: 'Removed' })
  async removeFriend(
    @Param('userId') otherUserId: string,
    @Req() req: Request,
  ) {
    const userId = this.requireUserId(req);
    await this.social.removeFriend(userId, otherUserId);
    return { ok: true };
  }

  /**
   * Invite a user to a room.
   *
   * @param roomId target room
   * @param dto invitee id
   * @param req authenticated request
   * @returns created invitation
   */
  @Post('rooms/:roomId/invitations')
  @ApiOperation({ summary: 'Invite a user to a room (members only)' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  invite(
    @Param('roomId') roomId: string,
    @Body() dto: CreateInvitationDto,
    @Req() req: Request,
  ) {
    const userId = this.requireUserId(req);
    return this.social.createInvitation(roomId, userId, dto.inviteeId);
  }

  /**
   * List room members. Available to anyone authenticated for now (no
   * sensitive data leaked); returns mini-profiles.
   *
   * @param roomId target room
   */
  @Get('rooms/:roomId/members')
  @ApiOperation({ summary: 'List members of a room' })
  @ApiResponse({ status: 200, description: 'Members list' })
  members(@Param('roomId') roomId: string) {
    return this.social.listRoomMembers(roomId);
  }

  /**
   * List the current user's pending server invitations.
   *
   * @param req authenticated request
   */
  @Get('me/invitations')
  @ApiOperation({ summary: "List the user's pending invitations" })
  @ApiResponse({ status: 200, description: 'Invitations list' })
  listInvitations(@Req() req: Request) {
    const userId = this.requireUserId(req);
    return this.social.listIncomingInvitations(userId);
  }

  /**
   * Accept an invitation — creates a membership row in the room.
   *
   * @param invitationId target invitation
   * @param req authenticated request
   */
  @Post('me/invitations/:invitationId/accept')
  @ApiOperation({ summary: 'Accept a pending invitation' })
  @ApiResponse({ status: 201, description: 'Accepted; user is now a member' })
  acceptInvitation(
    @Param('invitationId') invitationId: string,
    @Req() req: Request,
  ) {
    const userId = this.requireUserId(req);
    return this.social.acceptInvitation(userId, invitationId);
  }

  /**
   * Decline a pending invitation.
   *
   * @param invitationId target invitation
   * @param req authenticated request
   */
  @Post('me/invitations/:invitationId/decline')
  @ApiOperation({ summary: 'Decline a pending invitation' })
  @ApiResponse({ status: 200, description: 'Declined' })
  async declineInvitation(
    @Param('invitationId') invitationId: string,
    @Req() req: Request,
  ) {
    const userId = this.requireUserId(req);
    await this.social.declineInvitation(userId, invitationId);
    return { ok: true };
  }

  /**
   * Pulls the authenticated user id out of the request and throws if absent.
   *
   * @param req express request
   * @returns user id
   */
  private requireUserId(req: Request): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException();
    return id;
  }
}
