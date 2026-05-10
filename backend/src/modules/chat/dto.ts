import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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

/**
 * Body for creating a new room (server).
 *
 * `badge` is the short two-letter avatar text shown in the sidebar (e.g. "NX",
 * "SS"). It is restricted to letters/digits/space so the seed data shape
 * remains predictable.
 */
export class CreateRoomDto {
  @ApiProperty({ description: 'Server display name', example: 'Study Group' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    description: 'Optional short tagline shown under the name',
    example: 'Whiteboard • host tools',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  meta?: string;

  @ApiProperty({
    description: 'Optional 1-3 character badge (avatar text) for the sidebar',
    example: 'SG',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(3)
  @Matches(/^[A-Za-z0-9 ]+$/, {
    message: 'badge must contain only ASCII letters, digits, or spaces',
  })
  badge?: string;
}
