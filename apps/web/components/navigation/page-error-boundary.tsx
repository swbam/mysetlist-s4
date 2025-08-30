"use client";

import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  pageTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(_error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
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

      return (
        <div className="container mx-auto flex min-h-[600px] items-center justify-center px-4 py-16">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">
                {this.props.pageTitle
                  ? `${this.props.pageTitle} Error`
                  : "Page Error"}
              </CardTitle>
              <CardDescription>
                Something went wrong while loading this page. Don't worry, we
                can help you get back on track.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go to Homepage
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/artists">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Browse Artists
                  </Link>
                </Button>
              </div>

              {process.env['NODE_ENV'] === "development" && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="rounded-md bg-muted p-3">
                      <h4 className="font-medium text-sm">Error Message:</h4>
                      <pre className="mt-1 overflow-auto text-xs">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div className="rounded-md bg-muted p-3">
                        <h4 className="font-medium text-sm">Stack Trace:</h4>
                        <pre className="mt-1 overflow-auto text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div className="rounded-md bg-muted p-3">
                        <h4 className="font-medium text-sm">
                          Component Stack:
                        </h4>
                        <pre className="mt-1 overflow-auto text-xs">
                          {this.state.errorInfo.componentStack}
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

// Hook version for functional components
export function withPageErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  pageTitle?: string,
) {
  return function WithPageErrorBoundaryComponent(props: T) {
    return (
      <PageErrorBoundary pageTitle={pageTitle ?? "Page"}>
        <Component {...props} />
      </PageErrorBoundary>
    );
  };
}
