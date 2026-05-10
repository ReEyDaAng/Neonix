import {
  Body,
  Controller,
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
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateRoomDto, SendMessageDto } from './dto';

/**
 * Controller handling chat-related endpoints for rooms, channels, and messages.
 */
@ApiTags('Chat')
@Controller()
export class ChatController {
  /**
   * Constructor for ChatController.
   * @param chat Chat service instance
   * @param prisma Prisma service for resolving the authenticated user
   */
  constructor(
    private readonly chat: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Retrieves list of all chat rooms.
   * @returns Array of room objects
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('rooms')
  @ApiOperation({ summary: 'Get list of rooms (authenticated)' })
  @ApiResponse({ status: 200, description: 'Rooms fetched' })
  rooms() {
    return this.chat.listRooms();
  }

  /**
   * Creates a new room (server) on behalf of the authenticated user.
   *
   * Currently any authenticated user can create rooms — owner/role
   * semantics are out of scope for this prototype.
   *
   * @param dto room creation payload
   * @returns created Room
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('rooms')
  @ApiOperation({ summary: 'Create a new room (authenticated)' })
  @ApiResponse({ status: 201, description: 'Room created' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.chat.createRoom(dto.name, dto.meta, dto.badge);
  }

  /**
   * Retrieves list of channels in a specific room.
   * @param roomId Room identifier
   * @returns Array of channel objects
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('rooms/:roomId/channels')
  @ApiOperation({ summary: 'Get list of channels in a room (authenticated)' })
  @ApiResponse({ status: 200, description: 'Channels fetched' })
  channels(@Param('roomId') roomId: string) {
    return this.chat.listChannels(roomId);
  }

  /**
   * Retrieves messages in a specific channel.
   * @param roomId Room identifier
   * @param channelId Channel identifier
   * @param limit Optional limit (clamped to 1-200, default 50)
   * @returns Array of message objects
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('rooms/:roomId/channels/:channelId/messages')
  @ApiOperation({ summary: 'Get messages in a channel (authenticated)' })
  @ApiResponse({ status: 200, description: 'Messages fetched' })
  messages(
    @Param('roomId') roomId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    const limitNum = Math.min(
      Math.max(Number.isFinite(parsed) ? parsed : 50, 1),
      200,
    );
    return this.chat.listMessages(roomId, channelId, limitNum);
  }

  /**
   * Sends a new message to a channel as the authenticated user.
   *
   * The display name is resolved server-side from the JWT-bound user — the
   * `who` field in the request body is no longer trusted.
   *
   * @param roomId Room identifier
   * @param channelId Channel identifier
   * @param body Message payload (text, optional time)
   * @param body.text
   * @param body.time
   * @param req Authenticated request
   * @returns Created message object
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('rooms/:roomId/channels/:channelId/messages')
  @ApiOperation({ summary: 'Send a message to a channel (authenticated)' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async send(
    @Param('roomId') roomId: string,
    @Param('channelId') channelId: string,
    @Body() body: SendMessageDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const time =
      body.time ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return this.chat.sendMessage(
      roomId,
      channelId,
      user.displayName,
      body.text,
      time,
      userId,
    );
  }
}
