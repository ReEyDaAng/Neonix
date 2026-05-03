import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Request body for the LiveKit token issuance endpoint.
 */
export class IssueTokenDto {
  @ApiProperty({
    description: 'Identifier of the channel the user wants to join',
    example: '0d93b0a0-1e44-4a8c-a4b6-9f5a3a5b3c2f',
  })
  @IsUUID()
  channelId!: string;
}
