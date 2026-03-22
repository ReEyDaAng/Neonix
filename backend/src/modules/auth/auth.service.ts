import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../modules/prisma/prisma.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Service responsible for authentication and user identity operations.
 *
 * Supports registration, login, and token-based current user retrieval.
 */
@Injectable()
export class AuthService {
  /**
   *
   * @param prisma
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a user account and return signed object with JWT.
   *
   * @param email - user's email (must be unique)
   * @param password - raw password to be hashed
   * @param displayName - optional display name
   * @returns signed token and public user profile
   * @throws BadRequestException when email is already registered
   */
  async register(email: string, password: string, displayName?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email already registered');

    const user = await this.prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        displayName: displayName?.trim() || 'User',
        username: '@' + email.split('@')[0],
      },
    });

    return this.sign(user);
  }

  /**
   * Authenticate a user by email and password.
   *
   * @param email - user email
   * @param password - plaintext password
   * @returns signed token and public user fields
   * @throws UnauthorizedException when credentials are invalid
   */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('Invalid credentials');
    return this.sign(user);
  }

  /**
   * Resolve current user by JWT token.
   *
   * @param token - bearer token string
   * @returns public user profile
   * @throws UnauthorizedException when token is invalid or user missing
   */
  async me(token: string) {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.publicUser(user);
  }

  /**
   * Generate JWT and public profile data for a user.
   *
   * @param user - user object from database
   * @param user.id
   * @param user.email
   * @param user.displayName
   * @param user.username
   * @returns token and user profile
   */
  private sign(user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
  }) {
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { token, user: this.publicUser(user) };
  }

  /**
   * Hide internal security fields and expose public user payload.
   *
   * @param user - user object
   * @param user.id
   * @param user.email
   * @param user.displayName
   * @param user.username
   * @returns public user details
   */
  private publicUser(user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
    };
  }
}
