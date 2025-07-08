'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Navigation error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 p-6 text-center">
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="font-bold text-2xl text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            We encountered an error while loading this page. This might be a
            temporary issue.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={reset}
            variant="default"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go home
          </Button>
        </div>

        {process.env['NODE_ENV'] === 'development' && (
          <details className="mt-6 text-left">
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
    </div>
  );
}
