import {
  Body,
  Controller,
  Get,
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
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Controller handling authentication endpoints for user registration, login, and profile retrieval.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  /**
   * Constructor for AuthController.
   * @param auth Auth service instance
   */
  constructor(private readonly auth: AuthService) {}

  /**
   * Registers a new user account.
   * @param dto User registration data
   * @returns Authentication response with token and user info
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Email already registered' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  @ApiBody({ type: RegisterDto, description: 'User registration payload' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.displayName);
  }

  /**
   * Authenticates a user with email and password.
   * @param dto User login credentials
   * @returns Authentication response with token and user info
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @ApiBody({ type: LoginDto, description: 'User login payload' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /**
   * Retrieves current user profile from JWT.
   *
   * @param req authenticated request
   * @returns user profile information
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user from JWT token' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  me(@Req() req: Request) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.auth.getPublicUserById(userId);
  }
}
