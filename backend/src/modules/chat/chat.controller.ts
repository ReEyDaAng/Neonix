import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';

/**
 *
 */
@ApiTags('Chat')
@Controller()
export class ChatController {
  /**
   *
   * @param chat
   */
  constructor(private readonly chat: ChatService) {}

  /**
   *
   */
  @Get('rooms')
  @ApiOperation({ summary: 'Get list of rooms' })
  @ApiResponse({ status: 200, description: 'Rooms fetched' })
  rooms() {
    return this.chat.listRooms();
  }

  /**
   *
   * @param roomId
   */
  @Get('rooms/:roomId/channels')
  @ApiOperation({ summary: 'Get list of channels in a room' })
  @ApiResponse({ status: 200, description: 'Channels fetched' })
  channels(@Param('roomId') roomId: string) {
    return this.chat.listChannels(roomId);
  }

  /**
   *
   * @param roomId
   * @param channelId
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
   *
   * @param roomId
   * @param channelId
   * @param body
   * @param body.who
   * @param body.text
   * @param body.time
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
