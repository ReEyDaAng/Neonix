import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

type RequestWithId = Request & { requestId?: string };

/**
 * Middleware to assign a unique request ID to each HTTP request.
 * @param req Express request object
 * @param res Express response object
 * @param next Next function to continue middleware chain
 */
export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
): void {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId
      : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}
