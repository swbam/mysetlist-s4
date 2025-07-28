"use client"

import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"
import type React from "react"
import { Component, type ReactNode } from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error | undefined
  errorInfo?: string | undefined
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: string) => void
}

export class ErrorBoundaryWrapper extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  refs: any = {}

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo.componentStack)

    // Report to error tracking service
    if (typeof window !== "undefined" && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.retry)
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try
                again.
              </p>

              {process.env["NODE_ENV"] === "development" &&
                this.state.error && (
                  <details className="text-left text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                      {this.state.error.message}
                      {this.state.errorInfo && (
                        <>
                          {"\n\nComponent Stack:"}
                          {this.state.errorInfo}
                        </>
                      )}
                    </pre>
                  </details>
                )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={this.retry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/" className="gap-2">
                    <Home className="h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  return function WithErrorBoundaryComponent(props: P) {
    const Wrapper = ErrorBoundaryWrapper as any
    return (
      <Wrapper {...errorBoundaryProps}>
        <Component {...props} />
      </Wrapper>
    )
  }
}

// Specific error boundaries for different contexts
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const Wrapper = ErrorBoundaryWrapper as any
  return (
    <Wrapper
      onError={(_error: Error, _errorInfo: string) => {}}
      fallback={(_error: Error, retry: () => void) => (
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="mb-4 font-bold text-3xl">Page Error</h1>
            <p className="mx-auto mb-8 max-w-md text-muted-foreground">
              This page encountered an error and couldn't load properly. Please
              try refreshing the page or return to the home page.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button onClick={retry} size="lg" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/" className="gap-2">
                  <Home className="h-4 w-4" />
                  Return Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </Wrapper>
  )
}

export function ComponentErrorBoundary({
  children,
  componentName,
}: {
  children: ReactNode
  componentName?: string
}) {
  const Wrapper = ErrorBoundaryWrapper as any
  return (
    <Wrapper
      fallback={(_error: Error, retry: () => void) => (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-600 dark:text-red-400" />
            <h3 className="mb-2 font-semibold">
              {componentName ? `${componentName} Error` : "Component Error"}
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              This component encountered an error and couldn't render properly.
            </p>
            <Button onClick={retry} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </Wrapper>
  )
}
