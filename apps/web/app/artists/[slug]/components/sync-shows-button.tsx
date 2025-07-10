'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface SyncShowsButtonProps {
  artistId: string;
  artistName: string;
}

export function SyncShowsButton({
  artistId,
  artistName,
}: SyncShowsButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      // Call the sync API
      const response = await fetch('/api/artists/sync-shows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artistId }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync shows');
      }

      const data = await response.json();

      toast.success(
        `Successfully synced ${data.showsCount || 0} shows for ${artistName}`
      );

      // Refresh the page to show new data
      router.refresh();
    } catch (_error) {
      toast.error('Failed to sync shows. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'Sync Shows'}
    </Button>
  );
}
