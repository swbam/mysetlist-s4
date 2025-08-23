import * as Sentry from "@sentry/nextjs";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  userId?: string;
  showId?: string;
  artistId?: string;
  venueId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env['NODE_ENV'] === "development";
  private sentryLogger = Sentry.logger;

  private consoleLog(level: LogLevel, message: string, context?: LogContext) {
    // Always log to console in development
    if (this.isDevelopment) {
      const consoleMethod =
        level === "error" || level === "fatal"
          ? "error"
          : level === "warn"
            ? "warn"
            : "log";

      // Log to console with context
      console[consoleMethod](
        `[${level.toUpperCase()}] ${message}`,
        context ? JSON.stringify(context, null, 2) : "",
      );
    }
  }

  trace(message: string, context?: LogContext) {
    this.consoleLog("trace", message, context);

    // Use Sentry's new logging API
    this.sentryLogger.trace(message, context);
  }

  debug(message: string, context?: LogContext) {
    this.consoleLog("debug", message, context);

    // Use Sentry's new logging API
    this.sentryLogger.debug(message, context);
  }

  info(message: string, context?: LogContext) {
    this.consoleLog("info", message, context);

    // Use Sentry's new logging API
    this.sentryLogger.info(message, context);
  }

  warn(message: string, context?: LogContext) {
    this.consoleLog("warn", message, context);

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
    context?: LogContext,
  ) {
    if (errorOrContext instanceof Error) {
      // Handle error object
      const error = errorOrContext;
      this.consoleLog("error", message, context);

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
      this.consoleLog("error", message, ctx);

      // Use Sentry's new logging API
      this.sentryLogger.error(message, ctx);
    }
  }

  fatal(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext,
  ) {
    if (errorOrContext instanceof Error) {
      // Handle error object
      const error = errorOrContext;
      this.consoleLog("fatal", message, context);

      // Use Sentry's new logging API for structured error logging
      this.sentryLogger.fatal(message, {
        error: error.message,
        stack: error.stack,
        ...context,
      });

      // Also capture the exception for additional error tracking
      Sentry.captureException(error, {
        level: "fatal",
        contexts: {
          log: { message, context },
        },
      });
    } else {
      // Handle context object
      const ctx = errorOrContext as LogContext;
      this.consoleLog("fatal", message, ctx);

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
      ...(category && { category }),
      ...(data && { data }),
      timestamp: Date.now() / 1000,
    });
  }

  // Enhanced performance monitoring
  startTransaction(name: string, op: string) {
    // Using startSpan instead of deprecated startTransaction
    return Sentry.startSpan({ name, op }, () => {});
  }

  // Performance timing utility
  time(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.info(`Performance: ${label}`, {
        action: "performance_measurement",
        duration: Math.round(duration),
        label,
      });

      // Track slow operations in Sentry
      if (duration > 1000) {
        Sentry.addBreadcrumb({
          message: `Slow operation: ${label}`,
          level: "warning",
          data: { duration, label },
        });
      }

      return duration;
    };
  }

  // API call logging with comprehensive context
  api(
    method: string,
    endpoint: string,
    status: number,
    duration: number,
    context?: LogContext,
  ) {
    const apiContext = {
      ...context,
      action: "api_call",
      method,
      endpoint,
      status,
      duration: Math.round(duration),
      success: status < 400,
    };

    const message = `API ${method} ${endpoint} - ${status} (${duration}ms)`;

    if (status >= 500) {
      this.error(message, apiContext);
    } else if (status >= 400) {
      this.warn(message, apiContext);
    } else if (duration > 2000) {
      this.warn(`Slow API call: ${message}`, apiContext);
    } else {
      this.info(message, apiContext);
    }

    // Track API metrics
    Sentry.addBreadcrumb({
      message: `API ${method} ${endpoint}`,
      level: status >= 400 ? "error" : "info",
      category: "http",
      data: apiContext,
    });
  }

  // Database operation logging
  database(
    operation: string,
    table: string,
    duration: number,
    rowCount?: number,
    error?: Error,
    context?: LogContext,
  ) {
    const dbContext = {
      ...context,
      action: "database_operation",
      operation,
      table,
      duration: Math.round(duration),
      rowCount,
      success: !error,
    };

    const message = `DB ${operation} ${table} (${duration}ms${
      rowCount !== undefined ? `, ${rowCount} rows` : ""
    })`;

    if (error) {
      this.error(message, error, dbContext);
    } else if (duration > 1000) {
      this.warn(`Slow database operation: ${message}`, dbContext);
    } else {
      this.debug(message, dbContext);
    }
  }

  // User action tracking
  userAction(
    action: string,
    metadata?: Record<string, any>,
    context?: LogContext,
  ) {
    const userContext = {
      ...context,
      action: "user_action",
      userAction: action,
      ...metadata,
    };

    this.info(`User action: ${action}`, userContext);

    // Track in Sentry as breadcrumb
    Sentry.addBreadcrumb({
      message: `User: ${action}`,
      level: "info",
      category: "user",
      data: userContext,
    });
  }

  // Security event logging
  security(
    event: string,
    severity: "low" | "medium" | "high" | "critical",
    details?: Record<string, any>,
    context?: LogContext,
  ) {
    const securityContext = {
      ...context,
      action: "security_event",
      securityEvent: event,
      severity,
      ...details,
    };

    const message = `Security event: ${event} (${severity})`;

    if (severity === "critical" || severity === "high") {
      this.error(message, securityContext);
    } else if (severity === "medium") {
      this.warn(message, securityContext);
    } else {
      this.info(message, securityContext);
    }

    // Always track security events in Sentry
    Sentry.addBreadcrumb({
      message: `Security: ${event}`,
      level:
        severity === "low"
          ? "info"
          : severity === "medium"
            ? "warning"
            : "error",
      category: "security",
      data: securityContext,
    });
  }

  // Business metrics logging
  business(
    event: string,
    value?: number,
    metadata?: Record<string, any>,
    context?: LogContext,
  ) {
    const businessContext = {
      ...context,
      action: "business_event",
      businessEvent: event,
      value,
      ...metadata,
    };

    this.info(`Business event: ${event}`, businessContext);

    // Track business metrics
    Sentry.addBreadcrumb({
      message: `Business: ${event}`,
      level: "info",
      category: "business",
      data: businessContext,
    });
  }

  // Create child logger with inherited context
  child(childContext: LogContext): Logger {
    const childLogger = new Logger();
    // Store the child context for use in all logging methods
    (childLogger as any).childContext = childContext;

    // Override logging methods to include child context
    const originalMethods = [
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "fatal",
    ];
    originalMethods.forEach((method) => {
      const originalMethod = (childLogger as any)[method];
      (childLogger as any)[method] = (
        message: string,
        context?: LogContext,
      ) => {
        const mergedContext = { ...childContext, ...context };
        originalMethod.call(childLogger, message, mergedContext);
      };
    });

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing purposes
export { Logger };
