import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for posting a new chat message via REST. The display name is resolved
 * server-side from the JWT, so the client sends only the message text.
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Message text (1-4000 characters)',
    example: 'Hello world',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;

  @ApiProperty({
    description: 'Optional client-provided time label (HH:MM)',
    example: '13:01',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  time?: string;
}
