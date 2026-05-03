import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { extractBearer, verifyJwt } from '../auth/jwt.helper';

/**
 * HTTP guard that verifies a Bearer JWT and attaches the user id to `req.user.id`.
 *
 * Throws UnauthorizedException when the token is missing or invalid.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * Execute the guard for an HTTP request.
   *
   * @param context Nest execution context
   * @returns true if the JWT is valid; throws otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(req.headers.authorization);
    const payload = verifyJwt(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or missing token');
    }

    req.user = { ...(req.user || {}), id: payload.sub };
    return true;
  }
}
