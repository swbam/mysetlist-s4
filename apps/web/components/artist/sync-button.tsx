"use client";

import { Button } from "@repo/design-system/button";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SyncButtonProps {
  artistId: string;
  artistName: string;
  lastSyncedAt?: Date | null;
}

export function ArtistSyncButton({
  artistId,
  artistName,
  lastSyncedAt,
}: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus("idle");

    try {
      const response = await fetch("/api/sync/unified-pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistId,
          mode: "single",
        }),
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      const result = await response.json();

      if (result.success) {
        setSyncStatus("success");
        toast.success(`Successfully synced ${artistName}`, {
          description: `Synced ${result.results.catalogSync?.songs || 0} songs, ${result.results.shows?.synced || 0} shows, and ${result.results.setlists?.synced || 0} setlists`,
        });

        // Refresh the page after a short delay to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || "Sync failed");
      }
    } catch (error) {
      setSyncStatus("error");
      toast.error("Sync failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getButtonContent = () => {
    if (isSyncing) {
      return (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Syncing...
        </>
      );
    }

    switch (syncStatus) {
      case "success":
        return (
          <>
            <Check className="h-4 w-4" />
            Synced!
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="h-4 w-4" />
            Sync Failed
          </>
        );
      default:
        return (
          <>
            <RefreshCw className="h-4 w-4" />
            Sync Data
          </>
        );
    }
  };

  const getLastSyncText = () => {
    if (!lastSyncedAt) {
      return "Never synced";
    }

    const now = new Date();
    const syncDate = new Date(lastSyncedAt);
    const diffMs = now.getTime() - syncDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Last synced ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
    if (diffHours > 0) {
      return `Last synced ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    return "Recently synced";
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        variant={syncStatus === "error" ? "destructive" : "outline"}
        size="sm"
      >
        {getButtonContent()}
      </Button>
      <span className="text-muted-foreground text-xs">{getLastSyncText()}</span>
    </div>
  );
}
