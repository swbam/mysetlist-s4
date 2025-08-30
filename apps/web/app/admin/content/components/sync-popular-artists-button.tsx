"use client";

import { Button } from "@repo/design-system";
import { Loader2, TrendingUp } from "lucide-react";
import { useState } from "react";

export function SyncPopularArtistsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/artists/sync-popular", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env['NEXT_PUBLIC_CRON_SECRET'] || "demo"}`,
        },
        body: JSON.stringify({
          limit: 50,
          genres: [
            "rock",
            "pop",
            "hip-hop",
            "electronic",
            "indie",
            "country",
            "jazz",
            "classical",
          ],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastResult(result);
      } else {
        const error = await response.json();
        setLastResult({ error: error.error || "Sync failed" });
      }
    } catch (_error) {
      setLastResult({ error: "Network error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleSync} disabled={isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <TrendingUp className="mr-2 h-4 w-4" />
        )}
        {isLoading ? "Syncing..." : "Sync Popular Artists"}
      </Button>

      {lastResult && (
        <div className="text-sm">
          {lastResult.error ? (
            <div className="rounded bg-red-50 p-2 text-red-600">
              Error: {lastResult.error}
            </div>
          ) : (
            <div className="rounded bg-green-50 p-2 text-green-600">
              Success! Synced {lastResult.results?.synced || 0} artists
              {lastResult.results?.errors > 0 &&
                ` (${lastResult.results.errors} errors)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
