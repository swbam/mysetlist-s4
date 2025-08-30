"use client";

import { Badge } from "@repo/design-system";
import { Card, CardContent } from "@repo/design-system";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { useArtistRealtime } from "~/hooks/use-artist-realtime";

interface ArtistPageWrapperProps {
  artistId: string;
  artistName: string;
  spotifyId?: string | null;
  initialData: {
    artist?: any;
    shows?: any[];
    songs?: any[];
    stats?: any;
  };
  children: React.ReactNode;
}

export function ArtistPageWrapper({
  artistId,
  initialData,
  children,
}: ArtistPageWrapperProps) {
  const { syncProgress, isConnected } = useArtistRealtime(artistId, {
    ...initialData,
    isLoading: false,
  });

  // Show sync progress notification
  const showSyncNotification =
    syncProgress.isImporting || syncProgress.stage === "completed";

  return (
    <>
      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <Badge
          variant={isConnected ? "default" : "destructive"}
          className="flex items-center gap-1"
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Offline
            </>
          )}
        </Badge>
      </div>

      {/* Sync Progress Notification */}
      {showSyncNotification && (
        <div className="container mx-auto pt-8 mb-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {syncProgress.isImporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          Syncing artist data...
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {syncProgress.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${syncProgress.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {syncProgress.stage ||
                          "Importing data from external sources..."}
                      </p>
                    </div>
                  </>
                ) : syncProgress.stage === "completed" ? (
                  <>
                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-green-700">
                        Sync completed! Artist data is now up to date.
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {children}
    </>
  );
}
