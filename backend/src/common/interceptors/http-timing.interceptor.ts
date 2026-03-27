import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Interceptor for measuring and logging HTTP request execution time.
 */
@Injectable()
export class HttpTimingInterceptor implements NestInterceptor {
  /**
   * Intercepts HTTP requests to measure execution time.
   * @param context Execution context
   * @param next Call handler
   * @returns Observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.url;
    const start = performance.now();

    return next.handle().pipe(
      tap(() => {
        const duration = performance.now() - start;
        console.log(`[HTTP] ${method} ${url} - ${duration.toFixed(2)}ms`);
      }),
    );
  }
}
