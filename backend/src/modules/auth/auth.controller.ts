import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

/**
 *
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  /**
   *
   * @param auth
   */
  constructor(private readonly auth: AuthService) {}

  /**
   *
   * @param dto
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
   *
   * @param dto
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
   *
   * @param authHeader
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
