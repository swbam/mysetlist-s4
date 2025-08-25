"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Progress } from "@repo/design-system/components/ui/progress";
import { CheckCircle, Music, Users, MapPin, Clock, AlertCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface ImportProgress {
  stage: 
    | "initializing"
    | "syncing-identifiers"
    | "importing-songs"
    | "importing-shows"
    | "creating-setlists"
    | "completed"
    | "failed";
  progress: number;
  message: string;
  error?: string;
  artistId?: string;
  slug?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  completedAt?: string;
}

interface ArtistImportLoadingProps {
  artistSlug: string;
  jobId?: string;
  onComplete?: (result: { artistId: string; slug: string }) => void;
}

export function ArtistImportLoading({
  jobId,
  onComplete,
}: ArtistImportLoadingProps) {
  const [progress, setProgress] = useState<ImportProgress>({
    stage: "initializing",
    progress: 0,
    message: "Starting import...",
  });
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Try to use Server-Sent Events for real-time updates
    const useSSE = () => {
      try {
        const eventSource = new EventSource(`/api/artists/import/progress/${jobId}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          console.log("SSE connection opened");
        };

        eventSource.onmessage = (event) => {
          try {
            const status = JSON.parse(event.data);
            setProgress(status);

            if (status.stage === "completed" && onComplete && status.slug) {
              onComplete({
                artistId: status.artistId,
                slug: status.slug,
              });
            }
          } catch (error) {
            console.error("Failed to parse SSE data:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.log("SSE error, falling back to polling:", error);
          setIsConnected(false);
          eventSource.close();
          // Fall back to polling
          startPolling();
        };

        return eventSource;
      } catch (error) {
        console.log("SSE not supported, using polling:", error);
        startPolling();
        return null;
      }
    };

    // Fallback polling method
    const startPolling = () => {
      const pollProgress = async () => {
        try {
          const response = await fetch(`/api/artists/import/progress/${jobId}`);
          if (response.ok) {
            const status = await response.json();
            setProgress(status);

            if (status.stage === "completed" && onComplete && status.slug) {
              onComplete({
                artistId: status.artistId,
                slug: status.slug,
              });
            }
          }
        } catch (error) {
          console.error("Failed to fetch import progress:", error);
        }
      };

      // Poll every 3 seconds
      const interval = setInterval(pollProgress, 3000);
      
      // Initial poll
      pollProgress();
      
      return () => clearInterval(interval);
    };

    // Start with SSE, fall back to polling if needed
    const eventSource = useSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [jobId, onComplete]);

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "syncing-identifiers":
        return <Music className="h-5 w-5 animate-pulse" />;
      case "importing-songs":
        return <Music className="h-5 w-5 animate-spin" />;
      case "importing-shows":
        return <MapPin className="h-5 w-5 animate-pulse" />;
      case "creating-setlists":
        return <Users className="h-5 w-5 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 animate-pulse" />;
    }
  };

  const getStageTitle = (stage: string) => {
    switch (stage) {
      case "initializing":
        return "Initializing Import";
      case "syncing-identifiers":
        return "Fetching Artist Data";
      case "importing-songs":
        return "Importing Complete Song Catalog";
      case "importing-shows":
        return "Importing Shows & Venues";
      case "creating-setlists":
        return "Creating Predicted Setlists";
      case "completed":
        return "Import Complete!";
      case "failed":
        return "Import Failed";
      default:
        return "Processing...";
    }
  };

  const getStageDescription = (stage: string) => {
    switch (stage) {
      case "initializing":
        return "Setting up the import process...";
      case "syncing-identifiers":
        return "Getting artist information from Ticketmaster and Spotify...";
      case "importing-songs":
        return "Importing all studio songs (filtering out live versions)...";
      case "importing-shows":
        return "Fetching upcoming shows and venue information...";
      case "creating-setlists":
        return "Creating predicted setlists for upcoming shows...";
      case "completed":
        return "All data has been successfully imported!";
      case "failed":
        return "Something went wrong during the import process.";
      default:
        return "";
    }
  };

  if (progress.stage === "failed") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border bg-card p-8 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Import Failed</h3>
          <p className="text-muted-foreground max-w-md">
            {progress.error || "An unexpected error occurred during import."}
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (progress.stage === "completed") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 rounded-lg border bg-card p-8 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Import Complete!</h3>
          <p className="text-muted-foreground">
            Successfully imported all artist data
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mt-6 w-full max-w-md">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{progress.totalSongs || 0}</div>
            <div className="text-sm text-muted-foreground">Studio Songs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{progress.totalShows || 0}</div>
            <div className="text-sm text-muted-foreground">Shows</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{progress.totalVenues || 0}</div>
            <div className="text-sm text-muted-foreground">Venues</div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            The artist page will automatically refresh with the new data
          </p>
          {isConnected && (
            <p className="text-xs text-green-600">
              ✓ Real-time updates active
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 rounded-lg border bg-card p-8">
      <div className="flex items-center space-x-3">
        {getStageIcon(progress.stage)}
        <h3 className="text-lg font-semibold">{getStageTitle(progress.stage)}</h3>
      </div>

      <div className="w-full max-w-lg space-y-4">
        <Progress value={progress.progress} className="w-full h-2" />
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground font-medium">
            {progress.message}
          </p>
          <p className="text-xs text-muted-foreground">
            {getStageDescription(progress.stage)}
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            {progress.progress}% complete
          </p>
        </div>
      </div>

      {/* Stage-specific information */}
      {progress.stage === "importing-songs" && (
        <div className="text-center space-y-2 max-w-md">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">
              Importing Complete Discography
            </p>
            <p className="text-xs text-blue-600 mt-1">
              We're filtering out live versions and importing only studio recordings for the best voting experience
            </p>
          </div>
        </div>
      )}

      {progress.stage === "importing-shows" && (
        <div className="text-center space-y-2 max-w-md">
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              Fetching Show Data
            </p>
            <p className="text-xs text-green-600 mt-1">
              Getting upcoming shows, historical performances, and venue information from Ticketmaster
            </p>
          </div>
        </div>
      )}

      {progress.stage === "creating-setlists" && (
        <div className="text-center space-y-2 max-w-md">
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-sm text-purple-700 font-medium">
              Creating Setlists
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Generating predicted setlists for upcoming shows based on popular songs and recent performances
            </p>
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className="text-center">
        {isConnected ? (
          <p className="text-xs text-green-600">
            ✓ Real-time updates active
          </p>
        ) : (
          <p className="text-xs text-orange-600">
            ⟳ Checking for updates...
          </p>
        )}
      </div>
    </div>
  );
}
