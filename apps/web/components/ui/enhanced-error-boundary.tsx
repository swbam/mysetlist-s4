"use client"

import { Button } from "@repo/design-system/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import React from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  level?: "page" | "component" | "section"
  className?: string
}

const DefaultErrorFallback = ({
  error,
  retry,
  level = "component",
}: {
  error: Error
  retry: () => void
  level?: "page" | "component" | "section"
}) => {
  const getErrorMessage = () => {
    switch (level) {
      case "page":
        return {
          title: "Something went wrong",
          description:
            "We encountered an unexpected error while loading this page.",
        }
      case "section":
        return {
          title: "Section unavailable",
          description: "This section could not be loaded. Please try again.",
        }
      default:
        return {
          title: "Component error",
          description:
            "This component encountered an error and could not be displayed.",
        }
    }
  }

  const { title, description } = getErrorMessage()

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h3 className="mb-2 font-semibold text-lg">{title}</h3>
      <p className="mb-4 text-muted-foreground text-sm">{description}</p>

      {process.env.NODE_ENV === "development" && (
        <details className="mb-4 max-w-md">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Error details (development only)
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-left text-xs">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={retry}
        className="flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}

export class EnhancedErrorBoundary extends React.Component<
  EnhancedErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Call the onError prop if provided
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    // In production, you might want to log to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback

      return (
        <div className={this.props.className}>
          <FallbackComponent
            error={this.state.error}
            retry={this.retry}
            level={this.props.level}
          />
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<EnhancedErrorBoundaryProps, "children">
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default EnhancedErrorBoundary
