'use client';

import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  Settings,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  enableAutoRetry?: boolean;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class EnhancedNavigationErrorBoundary extends React.Component<
  Props,
  State
> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry if enabled
    if (
      this.props.enableAutoRetry &&
      this.state.retryCount < (this.props.maxRetries || 3)
    ) {
      this.scheduleAutoRetry();
    }

    // Report to error tracking service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  override componentWillUnmount() {
    // Clear any pending retries
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
  }

  private scheduleAutoRetry = () => {
    const delay = Math.min(1000 * 2 ** this.state.retryCount, 10000); // Exponential backoff

    const timeout = setTimeout(() => {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, delay);

    this.retryTimeouts.push(timeout);
    this.setState({ isRetrying: true });
  };

  private handleManualRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  private handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }

    // Reload after clearing cache
    this.handleReload();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, errorInfo, retryCount, isRetrying } = this.state;
      const maxRetries = this.props.maxRetries || 3;
      const canRetry = retryCount < maxRetries;

      return (
        <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Navigation Error</CardTitle>
              <CardDescription>
                Something went wrong while navigating. We're working to get you
                back on track.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Auto-retry indicator */}
              {isRetrying && (
                <div className="flex items-center justify-center gap-2 rounded-md bg-muted p-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Automatically retrying...</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Button
                  onClick={this.handleManualRetry}
                  disabled={!canRetry || isRetrying}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {retryCount > 0
                    ? `Retry (${retryCount}/${maxRetries})`
                    : 'Try Again'}
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>

                <Button
                  onClick={this.handleClearCache}
                  variant="outline"
                  className="w-full"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Clear Cache
                </Button>
              </div>

              {/* Navigation shortcuts */}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Homepage
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/artists">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Browse Artists
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/trending">
                    <Zap className="mr-2 h-4 w-4" />
                    Trending
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/contact">
                    <Settings className="mr-2 h-4 w-4" />
                    Contact Support
                  </Link>
                </Button>
              </div>

              {/* Error details for development */}
              {process.env["NODE_ENV"] === 'development' && error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md bg-muted p-4">
                      <h4 className="font-medium text-sm">Error Message:</h4>
                      <pre className="mt-2 overflow-auto text-xs">
                        {error.message}
                      </pre>
                    </div>

                    {error.stack && (
                      <div className="rounded-md bg-muted p-4">
                        <h4 className="font-medium text-sm">Stack Trace:</h4>
                        <pre className="mt-2 overflow-auto text-xs">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {errorInfo && (
                      <div className="rounded-md bg-muted p-4">
                        <h4 className="font-medium text-sm">
                          Component Stack:
                        </h4>
                        <pre className="mt-2 overflow-auto text-xs">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* User guidance */}
              <div className="rounded-md bg-muted/50 p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  {retryCount >= maxRetries
                    ? 'If the problem persists, please try refreshing the page or clearing your cache.'
                    : 'This error has been automatically reported. You can try again or navigate to a different page.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using the error boundary in functional components
export function useEnhancedErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const resetError = () => setError(null);

  const reportError = (error: Error, _errorInfo?: React.ErrorInfo) => {
    setError(error);
  };

  return { error, resetError, reportError };
}

// Higher-order component wrapper
export function withEnhancedNavigationErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options?: {
    enableAutoRetry?: boolean;
    maxRetries?: number;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }
) {
  return function WithEnhancedNavigationErrorBoundaryComponent(props: T) {
    const boundaryProps: Props = {
      children: <Component {...props} />,
      enableAutoRetry: options?.enableAutoRetry ?? false,
      maxRetries: options?.maxRetries ?? 3,
    };
    
    if (options?.onError) {
      boundaryProps.onError = options.onError;
    }
    
    return <EnhancedNavigationErrorBoundary {...boundaryProps} />;
  };
}
