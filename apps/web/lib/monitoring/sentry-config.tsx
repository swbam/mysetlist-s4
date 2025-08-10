import * as Sentry from "@sentry/nextjs";
import React from "react";

export function initSentry() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Basic integrations - advanced integrations commented out for compatibility
    // integrations: [
    //   // Performance monitoring integrations would go here
    // ],

    // Configure error filtering
    beforeSend(event, hint) {
      // Filter out non-error events in production
      if (process.env.NODE_ENV === "production") {
        const error = hint.originalException;

        // Ignore certain errors
        if (error && error instanceof Error) {
          // Ignore network errors that are expected
          if (error.message?.includes("Network request failed")) {
            return null;
          }

          // Ignore user cancellations
          if (error.name === "AbortError") {
            return null;
          }

          // Ignore ResizeObserver errors (common browser issue)
          if (error.message?.includes("ResizeObserver loop limit exceeded")) {
            return null;
          }
        }
      }

      // Add user context if available
      const user = getUserContext();
      if (user) {
        event.user = {
          id: user.id,
          email: user.email,
        };
      }

      return event;
    },

    // Configure breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
        return null;
      }

      // Add custom breadcrumbs for important actions
      if (breadcrumb.category === "navigation") {
        breadcrumb.data = {
          ...breadcrumb.data,
          timestamp: new Date().toISOString(),
        };
      }

      return breadcrumb;
    },
  });
}

// Helper to get user context
function getUserContext() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// Custom error boundary - simplified to avoid type conflicts
export function withSentryErrorBoundary(Component: any, fallback?: any) {
  return Sentry.withErrorBoundary(Component, {
    fallback: fallback || ErrorFallback,
    showDialog: process.env.NODE_ENV !== "production",
  });
}

// Default error fallback component
function ErrorFallback({ error: _error, resetError }: any) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-4 text-gray-600">
          We're sorry for the inconvenience. Please try refreshing the page.
        </p>
        <button
          onClick={resetError}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// Performance monitoring helpers - simplified to avoid deprecated API usage
export function measureDatabaseQuery(queryName: string) {
  // Simplified implementation that just returns a no-op function
  // Full implementation would require updated Sentry APIs
  console.log(`DB Query: ${queryName}`);
  return () => {};
}

export function measureApiCall(endpoint: string, method = "GET") {
  // Simplified implementation that just returns a no-op function
  // Full implementation would require updated Sentry APIs
  console.log(`API Call: ${method} ${endpoint}`);
  return () => {};
}

export function capturePerformanceMetric(
  name: string,
  value: number,
  unit = "ms",
) {
  // Simplified implementation for performance metrics
  console.log(`Performance Metric: ${name} = ${value}${unit}`);
}
