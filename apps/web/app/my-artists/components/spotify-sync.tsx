"use client";

import { Button } from "@repo/design-system/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/dialog";
import { AlertCircle, CheckCircle, Loader2, Music2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/app/providers/auth-provider";

export function SpotifySync() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [syncedCount, setSyncedCount] = useState(0);

  const handleSpotifySync = async () => {
    setIsSyncing(true);
    setSyncStatus("syncing");

    try {
      // First, ensure user is connected to Spotify
      const response = await fetch("/api/user/spotify/artists", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to sync Spotify artists");
      }

      const data = await response.json();
      setSyncedCount(data.syncedCount || 0);
      setSyncStatus("success");

      toast.success(`Synced ${data.syncedCount} artists from Spotify`);

      // Refresh the page to show new artists
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (_error) {
      setSyncStatus("error");
      toast.error("Failed to sync Spotify artists");
    } finally {
      setIsSyncing(false);
    }
  };

  const connectToSpotify = async () => {
    try {
      const response = await fetch("/api/auth/spotify/authorize");
      const { url } = await response.json();
      window.location.href = url;
    } catch (_error) {
      toast.error("Failed to connect to Spotify");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Music2 className="mr-2 h-4 w-4" />
          Sync with Spotify
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Your Spotify Artists</DialogTitle>
          <DialogDescription>
            Import your followed artists from Spotify to automatically track
            their upcoming shows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {syncStatus === "idle" && (
            <>
              <div className="flex items-center justify-center p-8">
                <Music2 className="h-16 w-16 text-muted-foreground" />
              </div>
              <p className="text-center text-muted-foreground text-sm">
                Connect your Spotify account to import your followed artists and
                get personalized concert recommendations.
              </p>
            </>
          )}

          {syncStatus === "syncing" && (
            <div className="flex flex-col items-center justify-center space-y-4 p-8">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-sm">
                Syncing your Spotify artists...
              </p>
            </div>
          )}

          {syncStatus === "success" && (
            <div className="flex flex-col items-center justify-center space-y-4 p-8">
              <CheckCircle className="h-16 w-16 text-green-600" />
              <div className="text-center">
                <p className="font-semibold">Sync Complete!</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Successfully imported {syncedCount} artists
                </p>
              </div>
            </div>
          )}

          {syncStatus === "error" && (
            <div className="flex flex-col items-center justify-center space-y-4 p-8">
              <AlertCircle className="h-16 w-16 text-red-600" />
              <div className="text-center">
                <p className="font-semibold">Sync Failed</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  There was an error syncing your Spotify artists. Please try
                  again.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {syncStatus === "idle" && (
            <Button
              onClick={
                user?.app_metadata?.provider === "spotify"
                  ? handleSpotifySync
                  : connectToSpotify
              }
              disabled={isSyncing}
              className="w-full"
            >
              {user?.app_metadata?.provider === "spotify"
                ? "Start Sync"
                : "Connect Spotify"}
            </Button>
          )}

          {(syncStatus === "success" || syncStatus === "error") && (
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setSyncStatus("idle");
              }}
              className="w-full"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
