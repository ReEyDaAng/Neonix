import { NextFunction, Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Creates middleware for logging HTTP requests.
 * @param logger Logger service instance
 * @returns Express middleware function
 */
export function createRequestLoggingMiddleware(logger: AppLoggerService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - start;

      logger.log('HTTP request completed', 'HTTP', {
        requestId: req.requestId || null,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null,
        userId: req.user?.id || null,
      });
    });

    next();
  };
}
