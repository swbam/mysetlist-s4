"use client";

import { Button } from "@repo/design-system";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function TrendingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="font-bold text-2xl text-foreground">
            Error Loading Trending Data
          </h1>
          <p className="text-muted-foreground">
            We're having trouble loading trending data right now. This might be
            a temporary issue with our servers.
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
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
