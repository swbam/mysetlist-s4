import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  showId?: string;
  artistId?: string;
  venueId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env['NODE_ENV'] === 'development';
  private sentryLogger = Sentry.logger;

  private consoleLog(level: LogLevel, message: string, context?: LogContext) {
    // Always log to console in development
    if (this.isDevelopment) {
      const consoleMethod =
        level === 'error' || level === 'fatal'
          ? 'error'
          : level === 'warn'
            ? 'warn'
            : 'log';
      console[consoleMethod](
        `[${level.toUpperCase()}]`,
        message,
        context || ''
      );
    }
  }

  trace(message: string, context?: LogContext) {
    this.consoleLog('trace', message, context);

    // Use Sentry's new logging API
    this.sentryLogger.trace(message, context);
  }

  debug(message: string, context?: LogContext) {
    this.consoleLog('debug', message, context);

    // Use Sentry's new logging API
    this.sentryLogger.debug(message, context);
  }

  info(message: string, context?: LogContext) {
    this.consoleLog('info', message, context);

    // Use Sentry's new logging API
    this.sentryLogger.info(message, context);
  }

  warn(message: string, context?: LogContext) {
    this.consoleLog('warn', message, context);

    // Use Sentry's new logging API
    this.sentryLogger.warn(message, context);
  }

  warning(message: string, context?: LogContext) {
    // Alias for warn to maintain backward compatibility
    this.warn(message, context);
  }

  error(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext
  ) {
    if (errorOrContext instanceof Error) {
      // Handle error object
      const error = errorOrContext;
      this.consoleLog('error', message, context);

      // Use Sentry's new logging API for structured error logging
      this.sentryLogger.error(message, {
        error: error.message,
        stack: error.stack,
        ...context,
      });

      // Also capture the exception for additional error tracking
      Sentry.captureException(error, {
        contexts: {
          log: { message, context },
        },
      });
    } else {
      // Handle context object
      const ctx = errorOrContext as LogContext;
      this.consoleLog('error', message, ctx);

      // Use Sentry's new logging API
      this.sentryLogger.error(message, ctx);
    }
  }

  fatal(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext
  ) {
    if (errorOrContext instanceof Error) {
      // Handle error object
      const error = errorOrContext;
      this.consoleLog('fatal', message, context);

      // Use Sentry's new logging API for structured error logging
      this.sentryLogger.fatal(message, {
        error: error.message,
        stack: error.stack,
        ...context,
      });

      // Also capture the exception for additional error tracking
      Sentry.captureException(error, {
        level: 'fatal',
        contexts: {
          log: { message, context },
        },
      });
    } else {
      // Handle context object
      const ctx = errorOrContext as LogContext;
      this.consoleLog('fatal', message, ctx);

      // Use Sentry's new logging API
      this.sentryLogger.fatal(message, ctx);
    }
  }

  // Utility method to add user context
  setUser(user: { id?: string; email?: string; username?: string }) {
    Sentry.setUser(user);
  }

  // Utility method to clear user context
  clearUser() {
    Sentry.setUser(null);
  }

  // Utility method to add breadcrumb
  addBreadcrumb(message: string, category?: string, data?: any) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  // Utility method to measure performance
  startTransaction(name: string, op: string) {
    return Sentry.startTransaction({ name, op });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing purposes
export { Logger };
