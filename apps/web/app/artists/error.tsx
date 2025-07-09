'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function ArtistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Artist page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16">
      <AlertCircle className="h-16 w-16 text-destructive" />
      <h1 className="font-bold text-4xl">Something went wrong!</h1>
      <p className="max-w-md text-center text-muted-foreground">
        We encountered an error while loading this artist page. Please try again.
      </p>
      <div className="flex gap-4">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" asChild>
          <a href="/artists">Browse Artists</a>
        </Button>
      </div>
    </div>
  );
}