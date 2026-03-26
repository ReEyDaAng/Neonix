import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

type JwtPayload = {
  sub: string;
};

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  username: string;
};

type DbUser = PublicUser & {
  password: string;
};

/**
 * Service responsible for authentication and user identity operations.
 *
 * Supports registration, login, and token-based current user retrieval.
 */
@Injectable()
export class AuthService {
  /**
   * @param prisma Prisma service for database access
   * @param logger application logger
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Create a user account and return signed object with JWT.
   *
   * @param email user's email, must be unique
   * @param password raw password to be hashed
   * @param displayName optional display name
   * @returns signed token and public user profile
   * @throws BadRequestException when email is already registered
   */
  async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<{ token: string; user: PublicUser }> {
    this.logger.log('User registration attempt', 'AuthService', {
      email,
    });

    const exists = (await this.prisma.user.findUnique({
      where: { email },
    })) as DbUser | null;

    if (exists) {
      this.logger.warn(
        'Registration failed: email already exists',
        'AuthService',
        {
          email,
        },
      );

      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = (await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        displayName: displayName?.trim() || 'User',
        username: '@' + email.split('@')[0],
      },
    })) as DbUser;

    this.logger.log('User registered successfully', 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return this.sign(user);
  }

  /**
   * Authenticate a user by email and password.
   *
   * @param email user email
   * @param password plaintext password
   * @returns signed token and public user fields
   * @throws UnauthorizedException when credentials are invalid
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: PublicUser }> {
    this.logger.log('User login attempt', 'AuthService', {
      email,
    });

    const user = (await this.prisma.user.findUnique({
      where: { email },
    })) as DbUser | null;

    if (!user) {
      this.logger.warn('Login failed: user not found', 'AuthService', {
        email,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn('Login failed: invalid credentials', 'AuthService', {
        email,
        userId: user.id,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log('User logged in successfully', 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return this.sign(user);
  }

  /**
   * Resolve current user by JWT token.
   *
   * @param token bearer token string
   * @returns public user profile
   * @throws UnauthorizedException when token is invalid or user missing
   */
  async me(token: string): Promise<PublicUser> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

      const user = (await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })) as DbUser | null;

      if (!user) {
        this.logger.warn(
          'User lookup by token failed: user not found',
          'AuthService',
          {
            userId: payload.sub,
          },
        );

        throw new UnauthorizedException('User not found');
      }

      this.logger.debug('Current user resolved from token', 'AuthService', {
        userId: user.id,
        email: user.email,
      });

      return this.publicUser(user);
    } catch (error) {
      this.logger.warn('Token verification failed', 'AuthService', {
        error: error instanceof Error ? error.message : 'Unknown token error',
      });

      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Generate JWT and public profile data for a user.
   *
   * @param user user object from database
   * @returns token and user profile
   */
  private sign(user: PublicUser): { token: string; user: PublicUser } {
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return {
      token,
      user: this.publicUser(user),
    };
  }

  /**
   * Hide internal security fields and expose public user payload.
   *
   * @param user user object
   * @returns public user details
   */
  private publicUser(user: PublicUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
    };
  }
}
