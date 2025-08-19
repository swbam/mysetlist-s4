"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: "page" | "component" | "section";
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ComprehensiveErrorBoundary extends React.Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

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
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Silent error logging in production to prevent console spam
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error);
      console.error("Error info:", errorInfo);
    }

    this.setState({
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Track error in monitoring (but don't log to console in production)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: error.toString(),
        fatal: false,
        custom_map: {
          error_boundary: this.props.name || "Unknown",
          component_stack: errorInfo.componentStack,
        },
      });
    }
  }

  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const maxRetries = 3;
    if (this.state.retryCount < maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));

      // Reset retry count after successful recovery
      this.retryTimeoutId = setTimeout(() => {
        this.setState({ retryCount: 0 });
      }, 30000); // Reset after 30 seconds
    }
  };

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            reset={this.handleRetry}
          />
        );
      }

      // Default error UI based on level
      return (
        <ErrorFallbackUI
          error={this.state.error!}
          retryCount={this.state.retryCount}
          level={this.props.level || "component"}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          name={this.props.name}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackUIProps {
  error: Error;
  retryCount: number;
  level: "page" | "component" | "section";
  onRetry: () => void;
  onGoHome: () => void;
  name?: string;
}

function ErrorFallbackUI({
  error,
  retryCount,
  level,
  onRetry,
  onGoHome,
  name,
}: ErrorFallbackUIProps) {
  const maxRetries = 3;
  const canRetry = retryCount < maxRetries;

  const getErrorMessage = () => {
    if (error.message.includes("ChunkLoadError") || error.message.includes("Loading chunk")) {
      return "Failed to load application resources. This might be due to a network issue or outdated cached files.";
    }
    if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
      return "Network connection error. Please check your internet connection and try again.";
    }
    if (error.message.includes("hydrat")) {
      return "Application initialization error. Please refresh the page.";
    }
    return "An unexpected error occurred while loading this content.";
  };

  const getTitle = () => {
    switch (level) {
      case "page":
        return "Page Error";
      case "component":
        return "Component Error";
      case "section":
        return "Section Error";
      default:
        return "Error";
    }
  };

  const getContainerClass = () => {
    switch (level) {
      case "page":
        return "min-h-screen flex items-center justify-center p-4";
      case "component":
        return "p-4 rounded-lg border border-destructive/20 bg-destructive/5";
      case "section":
        return "p-3 rounded border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950";
      default:
        return "p-4";
    }
  };

  return (
    <div className={getContainerClass()}>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">
            {getTitle()}
            {name && <span className="text-sm text-muted-foreground ml-2">({name})</span>}
          </CardTitle>
          <CardDescription>
            {getErrorMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words bg-muted p-3 rounded text-xs">
                {error.stack || error.message}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col gap-2 sm:flex-row">
            {canRetry && (
              <Button onClick={onRetry} className="flex-1" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
                {retryCount > 0 && ` (${retryCount}/${maxRetries})`}
              </Button>
            )}
            
            {level === "page" && (
              <Button onClick={onGoHome} variant="outline" className="flex-1">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            )}
          </div>

          {!canRetry && (
            <p className="text-sm text-muted-foreground text-center">
              Maximum retry attempts reached. Please refresh the page or contact support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook version for use in function components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Higher-order component version
export function withErrorBoundary<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <ComprehensiveErrorBoundary {...errorBoundaryProps}>
      <Component {...(props as any)} ref={ref} />
    </ComprehensiveErrorBoundary>
  ));

  if (Component.displayName) {
    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName})`;
  } else if (Component.name) {
    WrappedComponent.displayName = `withErrorBoundary(${Component.name})`;
  }

  return WrappedComponent;
}

// Specialized error boundaries for different use cases
export const PageErrorBoundary = ({ children, ...props }: Omit<Props, "level">) => (
  <ComprehensiveErrorBoundary level="page" {...props}>
    {children}
  </ComprehensiveErrorBoundary>
);

export const ComponentErrorBoundary = ({ children, ...props }: Omit<Props, "level">) => (
  <ComprehensiveErrorBoundary level="component" {...props}>
    {children}
  </ComprehensiveErrorBoundary>
);

export const SectionErrorBoundary = ({ children, ...props }: Omit<Props, "level">) => (
  <ComprehensiveErrorBoundary level="section" {...props}>
    {children}
  </ComprehensiveErrorBoundary>
);