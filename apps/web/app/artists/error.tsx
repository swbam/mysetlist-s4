'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function ArtistsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Artists page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <h1 className="mb-4 text-2xl font-bold">Unable to Load Artists</h1>
        
        <p className="mb-8 text-muted-foreground">
          We're having trouble loading the artists right now. This might be a temporary issue.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 rounded-lg bg-muted p-4 text-left">
            <p className="font-mono text-sm text-muted-foreground">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
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
      </div>
    </div>
  );
}