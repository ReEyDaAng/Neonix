import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get("rooms")
  rooms() {
    return this.chat.listRooms();
  }

  @Get("rooms/:roomId/channels")
  channels(@Param("roomId") roomId: string) {
    return this.chat.listChannels(roomId);
  }

  @Get("rooms/:roomId/channels/:channelId/messages")
  messages(@Param("roomId") roomId: string, @Param("channelId") channelId: string) {
    return this.chat.listMessages(roomId, channelId);
  }

  @Post("rooms/:roomId/channels/:channelId/messages")
  send(
    @Param("roomId") roomId: string,
    @Param("channelId") channelId: string,
    @Body() body: { who: string; text: string; time: string }
  ) {
    return this.chat.sendMessage(roomId, channelId, body.who, body.text, body.time);
  }
}
