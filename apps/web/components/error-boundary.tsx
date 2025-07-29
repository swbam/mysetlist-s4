"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { captureException } from "@sentry/nextjs";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { Component, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  showErrorDetails?: boolean;
  maxRetries?: number;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;
  refs: {} = {};

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with additional context
    const errorId = captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        source: "react-error-boundary",
        retryCount: this.state.retryCount.toString(),
      },
      extra: {
        errorInfo,
        timestamp: new Date().toISOString(),
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      },
    });

    this.setState({ errorId });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Development logging
    if (process.env["NODE_ENV"] === "development") {
      console.group("🚨 React Error Boundary");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Sentry Event ID:", errorId);
      console.groupEnd();
    }
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index],
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any prop change if resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState((prevState) => ({
        retryCount: prevState.retryCount + 1,
        hasError: false,
        error: null,
        errorId: null,
      }));

      // Auto-retry after a delay
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary();
      }, 1000);
    }
  };

  handleReportProblem = () => {
    const { error, errorId } = this.state;

    if (error && errorId) {
      // Open feedback dialog or redirect to support
      const subject = encodeURIComponent(`Error Report: ${error.name}`);
      const body = encodeURIComponent(
        `Error ID: ${errorId}\nError: ${error.message}\nStack: ${error.stack}\nURL: ${window.location.href}\nUser Agent: ${navigator.userAgent}`,
      );

      window.open(
        `mailto:support@mysetlist.com?subject=${subject}&body=${body}`,
        "_blank",
      );
    }
  };

  override render(): React.ReactNode {
    const { hasError, error, errorId, retryCount } = this.state;
    const {
      children,
      fallback,
      showErrorDetails = false,
      maxRetries = 3,
    } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Something went wrong
              </CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Our team has
                been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showErrorDetails && error && (
                <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                  <p className="font-semibold text-destructive">{error.name}</p>
                  <p className="text-muted-foreground">{error.message}</p>
                  {errorId && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Error ID: {errorId}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                {retryCount < maxRetries ? (
                  <Button
                    onClick={this.handleRetry}
                    className="flex-1"
                    variant="default"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({maxRetries - retryCount} left)
                  </Button>
                ) : (
                  <Button
                    onClick={this.handleReportProblem}
                    className="flex-1"
                    variant="outline"
                  >
                    Report Problem
                  </Button>
                )}

                <Button asChild className="flex-1" variant="outline">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
              </div>

              {process.env["NODE_ENV"] === "development" && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Developer Details
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">
                    {error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Hook for functional components to access error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    captureException(error, {
      tags: {
        source: "manual-error-handler",
      },
      extra: errorInfo,
    });
  };
}

// Wrapper component for easier usage
interface WithErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  showErrorDetails?: boolean;
}

export function WithErrorBoundary({
  children,
  onError,
  showErrorDetails = process.env["NODE_ENV"] === "development",
}: WithErrorBoundaryProps) {
  return (
    <ErrorBoundary
      {...(onError && { onError })}
      showErrorDetails={showErrorDetails}
      maxRetries={3}
      resetOnPropsChange
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
