import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';

/**
 * Controller handling chat-related endpoints for rooms, channels, and messages.
 */
@ApiTags('Chat')
@Controller()
export class ChatController {
  /**
   * Constructor for ChatController.
   * @param chat Chat service instance
   */
  constructor(private readonly chat: ChatService) {}

  /**
   * Retrieves list of all chat rooms.
   * @returns Array of room objects
   */
  @Get('rooms')
  @ApiOperation({ summary: 'Get list of rooms' })
  @ApiResponse({ status: 200, description: 'Rooms fetched' })
  rooms() {
    return this.chat.listRooms();
  }

  /**
   * Retrieves list of channels in a specific room.
   * @param roomId Room identifier
   * @returns Array of channel objects
   */
  @Get('rooms/:roomId/channels')
  @ApiOperation({ summary: 'Get list of channels in a room' })
  @ApiResponse({ status: 200, description: 'Channels fetched' })
  channels(@Param('roomId') roomId: string) {
    return this.chat.listChannels(roomId);
  }

  /**
   * Retrieves messages in a specific channel.
   * @param roomId Room identifier
   * @param channelId Channel identifier
   * @returns Array of message objects
   */
  @Get('rooms/:roomId/channels/:channelId/messages')
  @ApiOperation({ summary: 'Get messages in a channel' })
  @ApiResponse({ status: 200, description: 'Messages fetched' })
  messages(
    @Param('roomId') roomId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.chat.listMessages(roomId, channelId);
  }

  /**
   * Sends a new message to a channel.
   * @param roomId Room identifier
   * @param channelId Channel identifier
   * @param body Message payload object
   * @param body.who Sender display name
   * @param body.text Message text content
   * @param body.time Message time label
   * @returns Created message object
   */
  @Post('rooms/:roomId/channels/:channelId/messages')
  @ApiOperation({ summary: 'Send a message to a channel' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        who: { type: 'string', example: 'Roma' },
        text: { type: 'string', example: 'Hello from API' },
        time: { type: 'string', example: '13:01' },
      },
      required: ['who', 'text', 'time'],
    },
  })
  send(
    @Param('roomId') roomId: string,
    @Param('channelId') channelId: string,
    @Body() body: { who: string; text: string; time: string },
  ) {
    return this.chat.sendMessage(
      roomId,
      channelId,
      body.who,
      body.text,
      body.time,
    );
  }
}
