'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

// Re-export all navigation error boundary components
export { PageErrorBoundary, withPageErrorBoundary } from './page-error-boundary';
export { RouteErrorBoundary, withRouteErrorBoundary } from './route-error-boundary';
export { SafeLink, useSafeNavigation } from './safe-link';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class NavigationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Navigation error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Force a page reload to clear any corrupted state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="sticky top-0 z-40 w-full border-b bg-background">
          <div className="container mx-auto flex min-h-20 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="font-medium text-sm">
                Navigation temporarily unavailable
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">Home</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
