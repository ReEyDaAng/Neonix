import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @MinLength(8) password!: string;
  @IsOptional() @IsString() displayName?: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
