"use client";

import { Card } from "@repo/design-system/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SyncProgressDetails } from "~/components/sync-status-indicator";
import { useArtistSync } from "~/hooks/use-sync-status";

interface ArtistPageWrapperProps {
  artistId: string;
  artistName: string;
  spotifyId?: string | null;
  children: React.ReactNode;
}

export function ArtistPageWrapper({
  artistId,
  artistName,
  spotifyId,
  children,
}: ArtistPageWrapperProps) {
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [isTriggeredSync, setIsTriggeredSync] = useState(false);
  
  const { triggerArtistSync, getSyncJobId, clearSync } = useArtistSync();

  // Auto-trigger sync for new artists (when user first clicks from search)
  useEffect(() => {
    if (spotifyId && !isTriggeredSync) {
      // Check if this is a fresh artist with minimal data that needs syncing
      // You could also check for specific indicators like missing show count, etc.
      const shouldSync = true; // For now, always sync - add logic as needed
      
      if (shouldSync) {
        triggerArtistSync(artistId, spotifyId, 'full_sync')
          .then((jobId) => {
            setSyncJobId(jobId);
            setIsTriggeredSync(true);
          })
          .catch((error) => {
            console.error('Failed to trigger artist sync:', error);
          });
      }
    }
  }, [artistId, spotifyId, isTriggeredSync, triggerArtistSync]);

  // Check for existing sync job
  useEffect(() => {
    const existingJobId = getSyncJobId(artistId);
    if (existingJobId) {
      setSyncJobId(existingJobId);
    }
  }, [artistId, getSyncJobId]);

  return (
    <>
      {syncJobId && (
        <div className="container mx-auto pt-8 mb-6">
          <SyncProgressDetails jobId={syncJobId} />
        </div>
      )}
      {children}
    </>
  );
}
