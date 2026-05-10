import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for sending a friend request. The target is identified by either
 * exact `username` (e.g. `@john`) or `email`. Whichever is given, only
 * one user will match (both fields are unique on User).
 */
export class CreateFriendRequestDto {
  @ApiProperty({ description: 'Target username (e.g. @john)', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  username?: string;

  @ApiProperty({ description: 'Target email address', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  email?: string;
}

/**
 * Body for inviting a friend to a server.
 */
export class CreateInvitationDto {
  @ApiProperty({ description: 'Target user id' })
  @IsUUID()
  inviteeId!: string;
}
