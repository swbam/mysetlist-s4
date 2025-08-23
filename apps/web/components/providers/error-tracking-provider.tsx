"use client";

import {
  addBreadcrumb,
  captureException,
  setContext,
  setUser,
} from "@sentry/nextjs";
import type React from "react";
import { createContext, useCallback, useContext, useEffect } from "react";
import { MonitoringService } from "~/lib/monitoring";

interface ErrorTrackingContextType {
  trackError: (error: Error, context?: Record<string, any>) => string | null;
  trackUserAction: (action: string, metadata?: Record<string, any>) => void;
  trackPerformance: (
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
  ) => void;
  setUserContext: (user: {
    id: string;
    email?: string;
    username?: string;
  }) => void;
  clearUserContext: () => void;
  addCustomContext: (key: string, data: Record<string, any>) => void;
  trackPageView: (path: string, metadata?: Record<string, any>) => void;
  isInitialized: boolean;
}

const ErrorTrackingContext = createContext<ErrorTrackingContextType | null>(
  null,
);

interface ErrorTrackingProviderProps {
  children: React.ReactNode;
  userId?: string;
  userEmail?: string;
  username?: string;
}

export function ErrorTrackingProvider({
  children,
  userId,
  userEmail,
  username,
}: ErrorTrackingProviderProps) {
  const trackError = useCallback(
    (error: Error, context?: Record<string, any>) => {
      try {
        // Add breadcrumb for error occurrence
        addBreadcrumb({
          message: `Error occurred: ${error.name}`,
          level: "error",
          data: {
            errorMessage: error.message,
            ...context,
          },
        });

        // Capture exception with enhanced context
        const eventId = captureException(error, {
          tags: {
            errorSource: "application",
            component: context?.['component'] || "unknown",
          },
          extra: {
            timestamp: new Date().toISOString(),
            url:
              typeof window !== "undefined" ? window.location.href : "unknown",
            userAgent:
              typeof navigator !== "undefined"
                ? navigator.userAgent
                : "unknown",
            ...context,
          },
          fingerprint: [
            error.name,
            error.message,
            context?.['component'] || "default",
          ],
        });

        // Track error in monitoring service
        MonitoringService.trackError(error, context);

        // Log in development
        if (process.env.NODE_ENV === "development") {
          console.group("🚨 Error Tracked");
          console.error("Error:", error);
          console.log("Context:", context);
          console.log("Sentry Event ID:", eventId);
          console.groupEnd();
        }

        return eventId;
      } catch (trackingError) {
        console.error("Failed to track error:", trackingError);
        return null;
      }
    },
    [],
  );

  const trackUserAction = useCallback(
    (action: string, metadata?: Record<string, any>) => {
      try {
        // Add breadcrumb for user action
        addBreadcrumb({
          message: `User action: ${action}`,
          level: "info",
          category: "user",
          ...(metadata && { data: metadata }),
        });

        // Track in monitoring service
        MonitoringService.trackUserAction(action, userId, metadata);

        if (process.env.NODE_ENV === "development") {
          console.log("👤 User Action Tracked:", action, metadata);
        }
      } catch (error) {
        console.error("Failed to track user action:", error);
      }
    },
    [userId],
  );

  const trackPerformance = useCallback(
    (operation: string, duration: number, metadata?: Record<string, any>) => {
      try {
        // Track performance metric
        MonitoringService.trackMetric({
          name: `performance.${operation}`,
          value: duration,
          unit: "ms",
          tags: {
            operation,
            userId: userId || "anonymous",
            ...metadata,
          },
        });

        // Add breadcrumb for slow operations
        if (duration > 1000) {
          addBreadcrumb({
            message: `Slow operation: ${operation}`,
            level: "warning",
            category: "performance",
            data: {
              duration,
              ...metadata,
            },
          });
        }

        if (process.env.NODE_ENV === "development") {
          console.log(
            "⚡ Performance Tracked:",
            operation,
            `${duration}ms`,
            metadata,
          );
        }
      } catch (error) {
        console.error("Failed to track performance:", error);
      }
    },
    [userId],
  );

  const setUserContext = useCallback(
    (user: { id: string; email?: string; username?: string }) => {
      try {
        // Set user context in Sentry
        setUser({
          id: user.id,
          ...(user.email && { email: user.email }),
          ...(user.username && { username: user.username }),
        });

        // Add user context for monitoring
        setContext("user", {
          id: user.id,
          email: user.email,
          username: user.username,
          timestamp: new Date().toISOString(),
        });

        addBreadcrumb({
          message: "User context set",
          level: "info",
          category: "auth",
          data: {
            userId: user.id,
            hasEmail: !!user.email,
            hasUsername: !!user.username,
          },
        });

        if (process.env.NODE_ENV === "development") {
          console.log("👤 User Context Set:", {
            id: user.id,
            email: user.email,
            username: user.username,
          });
        }
      } catch (error) {
        console.error("Failed to set user context:", error);
      }
    },
    [],
  );

  const clearUserContext = useCallback(() => {
    try {
      setUser(null);
      setContext("user", null);

      addBreadcrumb({
        message: "User context cleared",
        level: "info",
        category: "auth",
      });

      if (process.env.NODE_ENV === "development") {
        console.log("👤 User Context Cleared");
      }
    } catch (error) {
      console.error("Failed to clear user context:", error);
    }
  }, []);

  const addCustomContext = useCallback(
    (key: string, data: Record<string, any>) => {
      try {
        setContext(key, {
          ...data,
          timestamp: new Date().toISOString(),
        });

        if (process.env.NODE_ENV === "development") {
          console.log(`📝 Custom Context Added (${key}):`, data);
        }
      } catch (error) {
        console.error("Failed to add custom context:", error);
      }
    },
    [],
  );

  const trackPageView = useCallback(
    (path: string, metadata?: Record<string, any>) => {
      try {
        addBreadcrumb({
          message: `Page view: ${path}`,
          level: "info",
          category: "navigation",
          data: {
            path,
            ...metadata,
          },
        });

        MonitoringService.trackMetric({
          name: "page.view",
          value: 1,
          tags: {
            path,
            userId: userId || "anonymous",
            ...metadata,
          },
        });

        if (process.env.NODE_ENV === "development") {
          console.log("📄 Page View Tracked:", path, metadata);
        }
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
    },
    [userId],
  );

  // Initialize user context on mount
  useEffect(() => {
    if (userId) {
      setUserContext({
        id: userId,
        ...(userEmail && { email: userEmail }),
        ...(username && { username }),
      });
    }
  }, [userId, userEmail, username, setUserContext]);

  // Track unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(
        new Error(event.reason?.toString() || "Unhandled promise rejection"),
        {
          type: "unhandled_rejection",
          reason: event.reason,
        },
      );
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [trackError]);

  // Track global errors
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      trackError(event.error || new Error(event.message), {
        type: "global_error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener("error", handleGlobalError);

    return () => {
      window.removeEventListener("error", handleGlobalError);
    };
  }, [trackError]);

  const contextValue: ErrorTrackingContextType = {
    trackError,
    trackUserAction,
    trackPerformance,
    setUserContext,
    clearUserContext,
    addCustomContext,
    trackPageView,
    isInitialized: true,
  };

  return (
    <ErrorTrackingContext.Provider value={contextValue}>
      {children}
    </ErrorTrackingContext.Provider>
  );
}

export function useErrorTracking() {
  const context = useContext(ErrorTrackingContext);

  if (!context) {
    // Return a no-op implementation if provider is not available
    return {
      trackError: (error: Error, context?: Record<string, any>) => {
        console.error("Error tracking not initialized:", error, context);
        return null;
      },
      trackUserAction: (action: string, metadata?: Record<string, any>) => {
        console.log("User action (no tracking):", action, metadata);
      },
      trackPerformance: (
        operation: string,
        duration: number,
        metadata?: Record<string, any>,
      ) => {
        console.log(
          "Performance (no tracking):",
          operation,
          duration,
          metadata,
        );
      },
      setUserContext: (user: {
        id: string;
        email?: string;
        username?: string;
      }) => {
        console.log("Set user context (no tracking):", user);
      },
      clearUserContext: () => {
        console.log("Clear user context (no tracking)");
      },
      addCustomContext: (key: string, data: Record<string, any>) => {
        console.log("Add custom context (no tracking):", key, data);
      },
      trackPageView: (path: string, metadata?: Record<string, any>) => {
        console.log("Page view (no tracking):", path, metadata);
      },
      isInitialized: false,
    };
  }

  return context;
}

// Hook for tracking component lifecycle
export function useComponentTracking(componentName: string) {
  const { trackError, trackPerformance, addCustomContext } = useErrorTracking();

  useEffect(() => {
    const startTime = performance.now();

    addCustomContext("component", {
      name: componentName,
      mountTime: new Date().toISOString(),
    });

    return () => {
      const mountDuration = performance.now() - startTime;
      trackPerformance(`component.${componentName}.mount`, mountDuration, {
        component: componentName,
      });
    };
  }, [componentName, addCustomContext, trackPerformance]);

  return {
    trackComponentError: (error: Error, context?: Record<string, any>) =>
      trackError(error, { component: componentName, ...context }),
    trackComponentPerformance: (
      operation: string,
      duration: number,
      metadata?: Record<string, any>,
    ) =>
      trackPerformance(`component.${componentName}.${operation}`, duration, {
        component: componentName,
        ...metadata,
      }),
  };
}

export default ErrorTrackingProvider;
