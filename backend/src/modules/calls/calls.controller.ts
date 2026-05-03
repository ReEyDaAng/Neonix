import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IssueTokenDto } from './dto/issue-token.dto';
import { SaveAnnotationDto } from './dto/save-annotation.dto';

/**
 * REST endpoints for the calls subsystem: token issuance, call state, and
 * annotation snapshot persistence. All routes require a valid Bearer JWT.
 */
@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  /**
   * Constructor.
   *
   * @param calls calls service
   */
  constructor(private readonly calls: CallsService) {}

  /**
   * Issue a LiveKit access token for the authenticated user and channel.
   *
   * @param dto request payload
   * @param req authenticated request
   * @returns LiveKit token + connection info
   */
  @Post('token')
  @ApiOperation({ summary: 'Issue a LiveKit access token for a channel' })
  @ApiResponse({ status: 201, description: 'Token issued' })
  @ApiBody({ type: IssueTokenDto })
  token(@Body() dto: IssueTokenDto, @Req() req: Request) {
    const userId = this.requireUserId(req);
    return this.calls.issueToken(userId, dto.channelId);
  }

  /**
   * Resolve the current state of a call (presenter, raised hands, participants).
   *
   * @param channelId channel identifier
   * @returns call state snapshot
   */
  @Get(':channelId/state')
  @ApiOperation({ summary: 'Get the public state of an active call' })
  @ApiResponse({ status: 200, description: 'State retrieved' })
  state(@Param('channelId') channelId: string) {
    return this.calls.getState(channelId);
  }

  /**
   * Fetch the latest annotation snapshot for a channel.
   *
   * @param channelId channel identifier
   * @returns latest snapshot or null
   */
  @Get(':channelId/annotations')
  @ApiOperation({ summary: 'Get the latest annotation snapshot' })
  @ApiResponse({ status: 200, description: 'Snapshot retrieved' })
  async annotations(@Param('channelId') channelId: string) {
    const latest = await this.calls.latestAnnotation(channelId);
    return latest ?? null;
  }

  /**
   * Persist an annotation snapshot for a channel.
   *
   * @param channelId channel identifier
   * @param dto snapshot payload
   * @param req authenticated request
   * @returns id and createdAt of the saved row
   */
  @Post(':channelId/annotations')
  @ApiOperation({ summary: 'Persist an annotation snapshot for a channel' })
  @ApiResponse({ status: 201, description: 'Snapshot saved' })
  @ApiBody({ type: SaveAnnotationDto })
  saveAnnotation(
    @Param('channelId') channelId: string,
    @Body() dto: SaveAnnotationDto,
    @Req() req: Request,
  ) {
    const userId = this.requireUserId(req);
    return this.calls.saveAnnotation(channelId, userId, dto.payload);
  }

  /**
   * Internal helper to extract the authenticated user id or throw.
   *
   * @param req express request
   * @returns user id
   */
  private requireUserId(req: Request): string {
    const id = req.user?.id;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }
}
