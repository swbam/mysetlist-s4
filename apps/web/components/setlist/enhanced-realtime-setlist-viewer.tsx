"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { Music2, TrendingUp, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "~/app/providers/auth-provider";
import { useRealtimeSetlist } from "~/hooks/use-realtime-setlist";
import { useRealtimeVotes } from "~/hooks/use-realtime-votes";
import { VoteButton } from "../voting/vote-button";
import { VoteSummary } from "../voting/vote-summary";

interface RealtimeSetlistViewerProps {
  showId: string;
  isLive?: boolean;
  showVotes?: boolean;
}

export function EnhancedRealtimeSetlistViewer({
  showId,
  isLive = false,
  showVotes = true,
}: RealtimeSetlistViewerProps) {
  const { session } = useAuth();
  const [setlists, setSetlists] = useState<any[]>([]);
  const [setlistSongIds, setSetlistSongIds] = useState<string[]>([]);
  const [totalVotes, setTotalVotes] = useState({
    total: 0,
    upvotes: 0,
    downvotes: 0,
  });

  // Use the real-time setlist hook
  const { setlists: realtimeSetlists, isConnected } = useRealtimeSetlist({
    showId,
    onEvent: (event) => {
      console.log("Setlist event:", event);
    },
  });

  // Extract all setlist song IDs
  useEffect(() => {
    const songIds: string[] = [];
    realtimeSetlists.forEach((setlist) => {
      setlist.songs?.forEach((song: any) => {
        songIds.push(song.id);
      });
    });
    setSetlistSongIds(songIds);
    setSetlists(realtimeSetlists);
  }, [realtimeSetlists]);

  // Use real-time votes hook
  const { voteCounts, vote, isSubscribed } = useRealtimeVotes({
    setlistSongIds,
    userId: session?.user?.id,
    onVoteUpdate: (update) => {
      console.log("Vote updated:", update);
      // Update setlists with new vote data
      setSetlists((currentSetlists) =>
        currentSetlists.map((setlist) => ({
          ...setlist,
          songs: setlist.songs?.map((song: any) => {
            if (song.id === update.setlistSongId) {
              return {
                ...song,
                upvotes: update.upvotes,
                downvotes: update.downvotes,
                netVotes: update.netVotes,
                userVote: update.userVote,
              };
            }
            return song;
          }),
        })),
      );
    },
  });

  // Calculate total votes
  useEffect(() => {
    let total = 0;
    let upvotes = 0;
    let downvotes = 0;

    Object.values(voteCounts).forEach((voteData) => {
      total += voteData.upvotes + voteData.downvotes;
      upvotes += voteData.upvotes;
      downvotes += voteData.downvotes;
    });

    setTotalVotes({ total, upvotes, downvotes });
  }, [voteCounts]);

  const handleVote = useCallback(
    async (setlistSongId: string, voteType: "up" | "down" | null) => {
      try {
        await vote(setlistSongId, voteType);
      } catch (error) {
        console.error("Failed to vote:", error);
      }
    },
    [vote],
  );

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getTopVotedSongs = useCallback(() => {
    const allSongs: any[] = [];
    setlists.forEach((setlist) => {
      setlist.songs?.forEach((song: any) => {
        const voteData = voteCounts[song.id] || {
          upvotes: 0,
          downvotes: 0,
          netVotes: 0,
        };
        allSongs.push({
          id: song.id,
          title: song.song.title,
          artist: song.song.artist,
          netVotes: voteData.netVotes,
          upvotes: voteData.upvotes,
          downvotes: voteData.downvotes,
        });
      });
    });

    return allSongs.sort((a, b) => b.netVotes - a.netVotes);
  }, [setlists, voteCounts]);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Alert className={cn(!isConnected && "border-red-200 bg-red-50")}>
        <div className="flex items-center gap-2">
          {isConnected && isSubscribed ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            {isConnected && isSubscribed ? (
              <>
                Live updates enabled • Real-time voting active
                {isLive && (
                  <Badge variant="destructive" className="ml-2">
                    LIVE
                  </Badge>
                )}
              </>
            ) : (
              "Connecting to real-time updates..."
            )}
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Setlists */}
        <div className="space-y-4 lg:col-span-3">
          {setlists.map((setlist) => (
            <Card key={setlist.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Music2 className="h-5 w-5" />
                    {setlist.name}
                    <Badge
                      variant={
                        setlist.type === "actual" ? "default" : "secondary"
                      }
                    >
                      {setlist.type}
                    </Badge>
                    {setlist.isLocked && (
                      <Badge variant="outline">Locked</Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                {setlist.songs && setlist.songs.length > 0 ? (
                  <div className="space-y-2">
                    {setlist.songs
                      .sort((a: any, b: any) => a.position - b.position)
                      .map((song: any, index: number) => {
                        const voteData = voteCounts[song.id] || {
                          upvotes: song.upvotes || 0,
                          downvotes: song.downvotes || 0,
                          netVotes: song.netVotes || 0,
                          userVote: song.userVote || null,
                        };

                        return (
                          <div
                            key={song.id}
                            className={cn(
                              "flex items-center gap-3 rounded-lg p-3 transition-colors",
                              "hover:bg-muted/50",
                              song.isPlayed &&
                                "border border-green-200 bg-green-50",
                            )}
                          >
                            {/* Position */}
                            <div className="w-8 text-center font-medium text-muted-foreground text-sm">
                              {index + 1}
                            </div>

                            {/* Album Art */}
                            <div className="relative h-10 w-10 flex-shrink-0 rounded bg-muted">
                              {song.song.albumArtUrl ? (
                                <Image
                                  src={song.song.albumArtUrl}
                                  alt={song.song.album || song.song.title}
                                  fill
                                  className="rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Music2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Song Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="truncate font-medium">
                                  {song.song.title}
                                </h4>
                                {song.song.isExplicit && (
                                  <Badge variant="outline" className="text-xs">
                                    E
                                  </Badge>
                                )}
                                {song.isPlayed && (
                                  <Badge variant="default" className="text-xs">
                                    Played
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <span className="truncate">
                                  {song.song.artist}
                                </span>
                                {song.song.album && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">
                                      {song.song.album}
                                    </span>
                                  </>
                                )}
                                {song.song.durationMs && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {formatDuration(song.song.durationMs)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Voting */}
                            {showVotes &&
                              session &&
                              !setlist.isLocked &&
                              setlist.type === "predicted" && (
                                <VoteButton
                                  setlistSongId={song.id}
                                  currentVote={voteData.userVote}
                                  upvotes={voteData.upvotes}
                                  downvotes={voteData.downvotes}
                                  onVote={(voteType) =>
                                    handleVote(song.id, voteType)
                                  }
                                  variant="compact"
                                  size="sm"
                                />
                              )}

                            {/* Vote Count (read-only) */}
                            {showVotes &&
                              (!session ||
                                setlist.isLocked ||
                                setlist.type === "actual") && (
                                <div className="flex items-center gap-1 text-sm">
                                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                  <span
                                    className={cn(
                                      "font-medium",
                                      voteData.netVotes > 0 && "text-green-600",
                                      voteData.netVotes < 0 && "text-red-600",
                                    )}
                                  >
                                    {voteData.netVotes > 0 ? "+" : ""}
                                    {voteData.netVotes}
                                  </span>
                                </div>
                              )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Music2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No songs added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {setlists.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Music2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <h3 className="mb-2 font-medium text-lg">No setlists yet</h3>
                <p className="text-muted-foreground">
                  Setlists will appear here as they are created
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Vote Summary Sidebar */}
        {showVotes && totalVotes.total > 0 && (
          <div className="lg:col-span-1">
            <VoteSummary
              totalVotes={totalVotes.total}
              totalUpvotes={totalVotes.upvotes}
              totalDownvotes={totalVotes.downvotes}
              topSongs={getTopVotedSongs()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
