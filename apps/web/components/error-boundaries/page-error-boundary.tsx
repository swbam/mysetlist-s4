"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import { AlertTriangle, ChevronLeft, Home, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  showBackButton?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {}

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          title={this.props.fallbackTitle}
          description={this.props.fallbackDescription}
          showBackButton={this.props.showBackButton}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error | undefined;
  onReset: () => void;
  title?: string | undefined;
  description?: string | undefined;
  showBackButton?: boolean | undefined;
}

function ErrorFallback({
  error,
  onReset,
  title = "Something went wrong",
  description = "We encountered an error while loading this page. This might be a temporary issue.",
  showBackButton = true,
}: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-2xl p-8">
        <div className="flex flex-col items-center space-y-6 text-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>

          <div className="space-y-2">
            <h1 className="font-bold text-2xl text-foreground">{title}</h1>
            <p className="max-w-md text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={onReset}
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>

            {showBackButton && (
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Go back
              </Button>
            )}

            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go home
            </Button>
          </div>

          {process.env['NODE_ENV'] === "development" && error && (
            <details className="mt-6 w-full max-w-md text-left">
              <summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
                Error details (development only)
              </summary>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </Card>
    </div>
  );
}
