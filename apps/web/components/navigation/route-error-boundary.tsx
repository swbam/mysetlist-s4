"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  routeName?: string;
  showBackButton?: boolean;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(_error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service
    }
  }

  handleReset = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const routeDisplayName = this.props.routeName || "route";
      const showAdvancedOptions = this.state.retryCount > 2;

      return (
        <div className="container mx-auto flex min-h-[400px] items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                {routeDisplayName.charAt(0).toUpperCase() +
                  routeDisplayName.slice(1)}{" "}
                Error
              </CardTitle>
              <CardDescription>
                This {routeDisplayName} encountered an error and couldn't load
                properly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="w-full"
                  disabled={this.state.retryCount >= 5}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {this.state.retryCount > 0
                    ? `Retry (${this.state.retryCount}/5)`
                    : "Try Again"}
                </Button>

                {showAdvancedOptions && (
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Page
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Homepage
                  </Link>
                </Button>

                {this.props.showBackButton && (
                  <Button
                    onClick={() => window.history.back()}
                    variant="ghost"
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Button>
                )}
              </div>

              {this.state.retryCount >= 3 && (
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-muted-foreground text-sm">
                    Still having trouble? Try refreshing the page or{" "}
                    <Link
                      href="/contact"
                      className="text-primary hover:underline"
                    >
                      contact support
                    </Link>
                  </p>
                </div>
              )}

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
                    Debug Information
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="rounded-md bg-muted p-2">
                      <h4 className="font-medium text-xs">Error:</h4>
                      <pre className="mt-1 overflow-auto text-xs">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div className="rounded-md bg-muted p-2">
                        <h4 className="font-medium text-xs">Stack:</h4>
                        <pre className="mt-1 overflow-auto text-xs">
                          {this.state.error.stack
                            .split("\n")
                            .slice(0, 10)
                            .join("\n")}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping routes
export function withRouteErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  routeName?: string,
  showBackButton = true,
) {
  return function WithRouteErrorBoundaryComponent(props: T) {
    return (
      <RouteErrorBoundary
        routeName={routeName ?? "Page"}
        showBackButton={showBackButton}
      >
        <Component {...props} />
      </RouteErrorBoundary>
    );
  };
}
