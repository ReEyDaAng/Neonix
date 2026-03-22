import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
    description: 'Password (min 8 chars)',
    example: 'StrongPass123',
  })
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: 'Display name for the user',
    example: 'NeonixUser',
    required: false,
  })
  @IsOptional()
  @IsString()
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
