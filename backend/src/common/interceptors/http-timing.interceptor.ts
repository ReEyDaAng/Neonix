import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Interceptor for measuring and logging HTTP request execution time
 * through the structured AppLoggerService (JSON output).
 */
@Injectable()
export class HttpTimingInterceptor implements NestInterceptor {
  /**
   * @param logger application logger
   */
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Intercepts HTTP requests to measure execution time.
   * @param context Execution context
   * @param next Call handler
   * @returns Observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.url;
    const start = performance.now();

    return next.handle().pipe(
      tap(() => {
        const duration = performance.now() - start;
        this.logger.debug('HTTP timing', 'HttpTimingInterceptor', {
          method,
          url,
          durationMs: Math.round(duration),
        });
      }),
    );
  }
}
