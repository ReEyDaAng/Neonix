import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Global exception filter that catches all unhandled exceptions and logs them with structured data.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  /**
   * Constructor for AllExceptionsFilter.
   * @param logger Logger service for recording exceptions
   */
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Catches and handles exceptions, logging them and returning a user-friendly error response.
   * @param exception The caught exception object
   * @param host Arguments host providing context for the exception
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const errorId = randomUUID();

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttpException ? exception.getResponse() : null;

    let userMessage = 'Сталася внутрішня помилка. Спробуйте пізніше.';

    if (typeof responseBody === 'string') {
      userMessage = responseBody;
    }

    if (
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody
    ) {
      const messageValue = (responseBody as { message?: unknown }).message;

      if (typeof messageValue === 'string') {
        userMessage = messageValue;
      } else if (
        Array.isArray(messageValue) &&
        typeof messageValue[0] === 'string'
      ) {
        userMessage = messageValue[0];
      }
    }

    const trace = exception instanceof Error ? exception.stack : undefined;

    this.logger.error('Unhandled exception', trace, 'ExceptionsFilter', {
      errorId,
      requestId: request.requestId || null,
      method: request.method,
      path: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
      userId: request.user?.id || null,
      status,
    });

    response.status(status).json({
      errorId,
      requestId: request.requestId || null,
      statusCode: status,
      message: userMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
