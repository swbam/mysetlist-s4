'use client';

import { useState } from 'react';
import { Button } from '@repo/design-system/components/ui/button';
import { TrendingUp, Loader2 } from 'lucide-react';

export function SyncPopularArtistsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/artists/sync-popular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'demo'}`,
        },
        body: JSON.stringify({
          limit: 50,
          genres: ['rock', 'pop', 'hip-hop', 'electronic', 'indie', 'country', 'jazz', 'classical'],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastResult(result);
        console.log('Sync successful:', result);
      } else {
        const error = await response.json();
        console.error('Sync failed:', error);
        setLastResult({ error: error.error || 'Sync failed' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setLastResult({ error: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button 
        onClick={handleSync} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <TrendingUp className="h-4 w-4 mr-2" />
        )}
        {isLoading ? 'Syncing...' : 'Sync Popular Artists'}
      </Button>
      
      {lastResult && (
        <div className="text-sm">
          {lastResult.error ? (
            <div className="text-red-600 bg-red-50 p-2 rounded">
              Error: {lastResult.error}
            </div>
          ) : (
            <div className="text-green-600 bg-green-50 p-2 rounded">
              Success! Synced {lastResult.results?.synced || 0} artists
              {lastResult.results?.errors > 0 && ` (${lastResult.results.errors} errors)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 