import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

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
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Email already registered' })
  @ApiBody({ type: RegisterDto, description: 'User registration payload' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.displayName);
  }

  /**
   * Authenticates a user with email and password.
   * @param dto User login credentials
   * @returns Authentication response with token and user info
   */
  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto, description: 'User login payload' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /**
   * Retrieves current user profile from JWT token.
   * @param authHeader Authorization header containing Bearer token
   * @returns User profile information
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user from JWT token' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  me(@Headers('authorization') authHeader?: string) {
    const token = (authHeader || '').replace(/^Bearer\s+/i, '');
    return this.auth.me(token);
  }
}
