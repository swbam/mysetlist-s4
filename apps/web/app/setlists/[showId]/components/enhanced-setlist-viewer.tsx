"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { cn } from "@repo/design-system/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Music,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import React, { useState } from "react";
import { EnhancedVoteButton } from "~/components/voting/enhanced-vote-button";
import { useRealtimeSetlist } from "~/hooks/use-realtime-setlist";
import { SongSelector } from "./song-selector";

type EnhancedSetlistViewerProps = {
  showId: string;
  artistId?: string;
  artistName?: string;
};

export const EnhancedSetlistViewer = ({
  showId,
  artistId,
  artistName,
}: EnhancedSetlistViewerProps) => {
  const [activeSetlist, setActiveSetlist] = useState<string>("predicted");
  const [realtimeEvents, setRealtimeEvents] = useState<
    Array<{ id: string; message: string; timestamp: Date }>
  >([]);
  const [showEventNotifications, _setShowEventNotifications] = useState(true);

  const {
    setlists,
    loading,
    connectionStatus,
    isConnected: _isConnected,
    lastUpdate,
    refetch,
  } = useRealtimeSetlist({
    showId,
    onEvent: (event) => {
      // Handle real-time events
      let message = "";

      switch (event.type) {
        case "song_played": {
          const playedSong = setlists
            .flatMap((s) => s.songs)
            .find((s) => s.id === event.data.songId);
          if (playedSong) {
            message = `Now playing: ${playedSong.song.title}`;
          }
          break;
        }
        case "vote_update":
          message = "Vote counts updated";
          break;
        case "setlist_update":
          message = "Setlist updated";
          break;
        case "connection_change":
          if (event.data?.status === "connected") {
            message = "Live updates connected";
          }
          break;
      }

      if (message) {
        const newEvent = {
          id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          message,
          timestamp: event.timestamp,
        };
        setRealtimeEvents((prev) => [newEvent, ...prev].slice(0, 5));

        // Auto-remove after 5 seconds
        setTimeout(() => {
          setRealtimeEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
        }, 5000);
      }
    },
  });

  const currentSetlist = setlists.find((s) => s.type === activeSetlist);

  const handleVote = async (
    setlistSongId: string,
    voteType: "up" | "down" | null,
  ) => {
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistSongId,
          voteType,
        }),
      });

      if (!response.ok) {
      }
    } catch (_error) {}
  };

  const handleSongSuggestion = async (song: any) => {
    try {
      // First, upsert the song to ensure it exists in our database
      const songResponse = await fetch("/api/songs/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spotifyId: song.spotify_id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          albumArtUrl: song.album_art_url,
          duration: song.duration_ms,
          isExplicit: song.is_explicit,
          popularity: song.popularity,
          previewUrl: song.preview_url,
        }),
      });

      if (!songResponse.ok) {
        throw new Error("Failed to save song");
      }

      const { song: savedSong } = await songResponse.json();

      // Find the predicted setlist
      const predictedSetlist = setlists.find((s) => s.type === "predicted");
      if (!predictedSetlist) {
        throw new Error("No predicted setlist found");
      }

      // Add the song to the predicted setlist
      const addResponse = await fetch("/api/setlists/songs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistId: predictedSetlist.id,
          songId: savedSong.id,
          position: 999, // Will be auto-assigned to the end
        }),
      });

      if (!addResponse.ok) {
        throw new Error("Failed to add song to setlist");
      }

      // Refetch the setlists to update the UI
      await refetch();
    } catch (error) {
      console.error("Error suggesting song:", error);
      // Could add toast notification here
    }
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) {
      return "?:??";
    }
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "connecting":
        return <Wifi className="h-4 w-4 animate-pulse text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getConnectionMessage = () => {
    switch (connectionStatus) {
      case "connected":
        return "Live updates active";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection error";
      default:
        return "Disconnected";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading setlist...</p>
        </CardContent>
      </Card>
    );
  }

  // If there's no setlist yet, render an empty shell with song selector to let users start adding
  const isEmpty = !currentSetlist || currentSetlist.songs.length === 0;

  const songs = (currentSetlist?.songs || []).sort(
    (a, b) => a.position - b.position,
  );
  const playedSongs = songs.filter((song) => song.isPlayed).length;
  const progress = songs.length > 0 ? (playedSongs / songs.length) * 100 : 0;
  const currentlyPlaying = songs.find(
    (s) =>
      s.isPlayed &&
      songs.findIndex((song) => song.isPlayed) === songs.lastIndexOf(s),
  );

  return (
    <>
      {/* Real-time Event Notifications */}
      <AnimatePresence>
        {showEventNotifications && realtimeEvents.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {realtimeEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-lg"
              >
                <Volume2 className="h-4 w-4" />
                <span className="font-medium text-sm">{event.message}</span>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              {currentSetlist?.name ?? "Setlist"}
            </CardTitle>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div
                className="flex items-center gap-2 rounded-full bg-muted px-3 py-1"
                title={getConnectionMessage()}
              >
                {getConnectionIcon()}
                <span className="font-medium text-xs">
                  {getConnectionMessage()}
                </span>
              </div>

              {/* Progress Badge */}
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {playedSongs} of {songs.length} songs
              </Badge>

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={refetch}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {progress > 0 && <Progress value={progress} className="mt-2" />}

          {/* Setlist Type Tabs */}
          {setlists.length > 1 && (
            <div className="mt-4 flex gap-2">
              {setlists.map((setlist) => (
                <button
                  key={setlist.id}
                  onClick={() => setActiveSetlist(setlist.type)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm transition-colors",
                    activeSetlist === setlist.type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {setlist.type === "predicted" ? "Predicted" : "Actual"}
                </button>
              ))}
            </div>
          )}

          {/* Last Update Time */}
          {lastUpdate && (
            <p className="mt-2 text-muted-foreground text-xs">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>

        {/* Song Selector - Show when predicted list active or when empty to bootstrap */}
        {(activeSetlist === "predicted" || isEmpty) &&
          artistId &&
          artistName && (
            <div className="px-6 py-4 border-b">
              <SongSelector
                artistId={artistId}
                artistName={artistName}
                onSongSelect={handleSongSuggestion}
                disabled={loading}
              />
            </div>
          )}

        <CardContent className="p-0">
          <div className="divide-y">
            {songs.map((setlistSong) => {
              const isCurrentlyPlaying =
                currentlyPlaying?.id === setlistSong.id;

              return (
                <motion.div
                  key={setlistSong.id}
                  layout
                  className={cn(
                    "p-4 transition-all duration-300",
                    setlistSong.isPlayed &&
                      "bg-green-50/50 dark:bg-green-950/20",
                    isCurrentlyPlaying &&
                      "border-primary border-l-4 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex w-16 items-center gap-2">
                        <span className="font-bold text-lg text-muted-foreground">
                          {setlistSong.position}
                        </span>
                        {isCurrentlyPlaying && (
                          <PlayCircle className="h-5 w-5 animate-pulse text-primary" />
                        )}
                        {setlistSong.isPlayed && !isCurrentlyPlaying && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3
                            className={cn(
                              "font-semibold transition-colors",
                              isCurrentlyPlaying && "text-primary",
                            )}
                          >
                            {setlistSong.song.title}
                          </h3>
                          {setlistSong.notes && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-xs"
                            >
                              <Sparkles className="h-3 w-3" />
                              {setlistSong.notes}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <span>{setlistSong.song.artist}</span>
                          <span>•</span>
                          <span>
                            {formatDuration(setlistSong.song.durationMs)}
                          </span>
                          {setlistSong.playTime && (
                            <>
                              <span>•</span>
                              <span>
                                Played at{" "}
                                {new Date(
                                  setlistSong.playTime,
                                ).toLocaleTimeString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Album Art (if available) */}
                      {setlistSong.song.albumArtUrl && (
                        <img
                          src={setlistSong.song.albumArtUrl}
                          alt={`${setlistSong.song.title} album art`}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}

                      {/* Vote Button */}
                      {React.createElement(EnhancedVoteButton as any, {
                        setlistSongId: setlistSong.id,
                        ...(setlistSong.userVote !== undefined && {
                          currentVote: setlistSong.userVote,
                        }),
                        upvotes: setlistSong.upvotes,
                        onVote: (voteType: any) =>
                          handleVote(setlistSong.id, voteType),
                        disabled:
                          !setlistSong.isPlayed &&
                          currentSetlist?.type === "actual",
                        variant: "compact",
                        size: "sm",
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connection Issues Alert */}
      {connectionStatus === "error" && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Real-time updates are unavailable. The page will automatically
            reconnect when possible. You can also{" "}
            <Button variant="link" className="h-auto p-0" onClick={refetch}>
              refresh manually
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};
