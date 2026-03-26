import { Injectable, LoggerService } from '@nestjs/common';

type LogMeta = Record<string, unknown>;

/**
 * Logger service implementing NestJS LoggerService interface for structured JSON logging.
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly minLevel = process.env.LOG_LEVEL || 'info';

  private readonly levels = ['debug', 'log', 'warn', 'error'];

  /**
   * Checks if the given log level should be logged based on minimum level.
   * @param level The log level to check
   * @returns True if the level should be logged
   */
  private shouldLog(level: 'debug' | 'log' | 'warn' | 'error'): boolean {
    return (
      this.levels.indexOf(level) >= this.levels.indexOf(this.minLevel as never)
    );
  }

  /**
   * Formats a log message into JSON structure.
   * @param level Log level string
   * @param message Log message
   * @param context Optional context
   * @param meta Optional metadata
   * @param trace Optional stack trace
   * @returns Formatted JSON string
   */
  private formatMessage(
    level: string,
    message: string,
    context?: string,
    meta?: LogMeta,
    trace?: string,
  ): string {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      context: context || null,
      message,
      ...(meta ? { meta } : {}),
      ...(trace ? { trace } : {}),
    };

    return JSON.stringify(payload);
  }

  /**
   * Logs an info level message.
   * @param message The message to log
   * @param context Optional context string
   * @param meta Optional metadata object
   */
  log(message: string, context?: string, meta?: LogMeta): void {
    if (!this.shouldLog('log')) return;
    console.log(this.formatMessage('INFO', message, context, meta));
  }

  /**
   * Logs an error level message with optional trace.
   * @param message The error message to log
   * @param trace Optional stack trace
   * @param context Optional context string
   * @param meta Optional metadata object
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    meta?: LogMeta,
  ): void {
    if (!this.shouldLog('error')) return;
    console.error(this.formatMessage('ERROR', message, context, meta, trace));
  }

  /**
   * Logs a warning level message.
   * @param message The warning message to log
   * @param context Optional context string
   * @param meta Optional metadata object
   */
  warn(message: string, context?: string, meta?: LogMeta): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('WARN', message, context, meta));
  }

  /**
   * Logs a debug level message.
   * @param message The debug message to log
   * @param context Optional context string
   * @param meta Optional metadata object
   */
  debug(message: string, context?: string, meta?: LogMeta): void {
    if (!this.shouldLog('debug')) return;
    console.debug(this.formatMessage('DEBUG', message, context, meta));
  }
}
