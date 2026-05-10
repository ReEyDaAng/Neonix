import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 *
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password (8-72 chars; bcrypt hard-limits to 72 bytes)',
    example: 'StrongPass123',
  })
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({
    description: 'Display name for the user',
    example: 'NeonixUser',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}

/**
 *
 */
export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User password', example: 'StrongPass123' })
  @IsString()
  password!: string;
}
