import * as Sentry from "@sentry/nextjs";

// Enhanced Sentry configuration
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NODE_ENV || "development";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    debug: environment === "development",

    // Performance monitoring
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,

    // Session replay
    replaysSessionSampleRate: environment === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Enhanced error filtering
    beforeSend(event, _hint) {
      // Filter out known non-critical errors
      if (event.exception) {
        const error = event.exception.values?.[0];
        const errorMessage = error?.value || "";

        // Filter out common browser extension errors
        if (
          errorMessage.includes("Extension context invalidated") ||
          errorMessage.includes("chrome-extension://") ||
          errorMessage.includes("moz-extension://") ||
          errorMessage.includes("safari-extension://")
        ) {
          return null;
        }

        // Filter out chunk loading errors (usually not actionable)
        if (
          error?.type === "ChunkLoadError" ||
          errorMessage.includes("Loading chunk") ||
          errorMessage.includes("Loading CSS chunk")
        ) {
          return null;
        }

        // Filter out network errors that might be user's connection
        if (
          errorMessage.includes("NetworkError") ||
          errorMessage.includes("ERR_NETWORK") ||
          errorMessage.includes("ERR_INTERNET_DISCONNECTED")
        ) {
          return null;
        }

        // Filter out AbortError (usually from cancelled requests)
        if (error?.type === "AbortError") {
          return null;
        }
      }

      // Filter out non-actionable script errors
      if (
        event.message?.includes("Script error") ||
        event.message?.includes("Non-Error promise rejection")
      ) {
        return null;
      }

      return event;
    },

    // Enhanced breadcrumb filtering
    beforeBreadcrumb(breadcrumb, _hint) {
      // Filter out noisy console logs in production
      if (environment === "production" && breadcrumb.category === "console") {
        return null;
      }

      // Filter out noisy navigation breadcrumbs
      if (
        breadcrumb.category === "navigation" &&
        breadcrumb.data?.to?.includes("_next/static")
      ) {
        return null;
      }

      return breadcrumb;
    },

    // Disable heavy browser-only integrations during server builds to avoid errors
    integrations: [],

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",

    // Custom tags for better filtering
    initialScope: {
      tags: {
        component: "web-app",
        environment,
        deployment: process.env.VERCEL_ENV || "development",
      },
      level: "info",
    },
  });
} else if (environment === "development") {
}

/**
 * Enhanced error reporting utilities
 */
export class ErrorReporter {
  /**
   * Report API errors with context
   */
  static reportAPIError(
    error: Error,
    endpoint: string,
    method: string,
    status?: number,
    responseData?: any,
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag("error_type", "api_error");
      scope.setTag("endpoint", endpoint);
      scope.setTag("method", method);

      if (status) {
        scope.setTag("status_code", status.toString());
      }

      scope.setContext("api_call", {
        endpoint,
        method,
        status,
        responseData:
          typeof responseData === "string"
            ? responseData.substring(0, 1000) // Truncate long responses
            : responseData,
        timestamp: new Date().toISOString(),
      });

      Sentry.captureException(error);
    });
  }

  /**
   * Report database errors with query context
   */
  static reportDatabaseError(
    error: Error,
    query?: string,
    parameters?: any[],
    duration?: number,
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag("error_type", "database_error");

      scope.setContext("database_operation", {
        query: query?.substring(0, 500), // Truncate for privacy
        parameterCount: parameters?.length,
        duration,
        timestamp: new Date().toISOString(),
      });

      Sentry.captureException(error);
    });
  }

  /**
   * Report authentication errors
   */
  static reportAuthError(
    error: Error,
    context: {
      userId?: string;
      action?: string;
      provider?: string;
    },
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag("error_type", "auth_error");
      scope.setTag("auth_action", context.action || "unknown");

      if (context.provider) {
        scope.setTag("auth_provider", context.provider);
      }

      // Don't include sensitive user data
      scope.setContext("auth_operation", {
        action: context.action,
        provider: context.provider,
        hasUserId: !!context.userId,
        timestamp: new Date().toISOString(),
      });

      Sentry.captureException(error);
    });
  }

  /**
   * Report performance issues
   */
  static reportPerformanceIssue(
    operation: string,
    duration: number,
    threshold: number,
    metadata?: Record<string, any>,
  ): void {
    if (duration <= threshold) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setTag("issue_type", "performance");
      scope.setTag("operation", operation);
      scope.setLevel("warning");

      scope.setContext("performance_issue", {
        operation,
        duration,
        threshold,
        slowdownFactor: Math.round((duration / threshold) * 100) / 100,
        ...metadata,
        timestamp: new Date().toISOString(),
      });

      Sentry.captureMessage(
        `Slow operation detected: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        "warning",
      );
    });
  }

  /**
   * Report user feedback
   */
  static reportUserFeedback(
    _userId: string,
    _email: string,
    message: string,
    _eventId?: string,
  ): void {
    // captureUserFeedback is deprecated, using captureMessage instead
    Sentry.captureMessage(`User feedback: ${message}`, "info");
  }
}

/**
 * Transaction wrapper for performance monitoring
 */
export function withSentryTransaction<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    async () => {
      try {
        return await fn();
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

/**
 * Add user context to Sentry
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    ...(user.email && { email: user.email }),
    ...(user.username && { username: user.username }),
  });
}

/**
 * Clear user context from Sentry
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry
 */
export function setSentryContext(
  key: string,
  context: Record<string, any>,
): void {
  Sentry.setContext(key, context);
}

export { Sentry };
