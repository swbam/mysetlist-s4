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
import { useEffect, useState } from "react";
import { useAuth } from "~/app/providers/auth-provider";
import { VoteButton } from "../voting/vote-button";
import { VoteSummary } from "../voting/vote-summary";

interface RealtimeSetlistViewerProps {
  showId: string;
  isLive?: boolean;
  showVotes?: boolean;
  refreshInterval?: number;
}

export function RealtimeSetlistViewer({
  showId,
  isLive = false,
  showVotes = true,
  refreshInterval = 30000, // 30 seconds
}: RealtimeSetlistViewerProps) {
  const { session } = useAuth();
  const [setlists, setSetlists] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [totalVotes, setTotalVotes] = useState({
    total: 0,
    upvotes: 0,
    downvotes: 0,
  });

  useEffect(() => {
    fetchSetlists();

    const interval = setInterval(() => {
      fetchSetlists();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [showId, refreshInterval]);

  const fetchSetlists = async () => {
    try {
      const response = await fetch(`/api/setlists/${showId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch setlists");
      }

      const data = await response.json();
      setSetlists(data.setlists || []);
      setLastUpdate(new Date());
      setIsConnected(true);

      // Calculate total votes
      const votes = data.setlists.reduce(
        (acc: any, setlist: any) => {
          setlist.songs?.forEach((song: any) => {
            acc.total += song.upvotes + song.downvotes;
            acc.upvotes += song.upvotes;
            acc.downvotes += song.downvotes;
          });
          return acc;
        },
        { total: 0, upvotes: 0, downvotes: 0 },
      );

      setTotalVotes(votes);
    } catch (_error) {
      setIsConnected(false);
    }
  };

  const handleVote = async (
    setlistSongId: string,
    voteType: "up" | "down" | null,
  ) => {
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
      throw new Error("Failed to vote");
    }

    // Optimistically update local state
    setSetlists((currentSetlists) =>
      currentSetlists.map((setlist) => ({
        ...setlist,
        songs: setlist.songs?.map((song: any) => {
          if (song.id === setlistSongId) {
            const currentVote = song.userVote;
            let upvotes = song.upvotes;
            let downvotes = song.downvotes;

            // Remove previous vote
            if (currentVote === "up") {
              upvotes--;
            }
            if (currentVote === "down") {
              downvotes--;
            }

            // Add new vote
            if (voteType === "up") {
              upvotes++;
            }
            if (voteType === "down") {
              downvotes++;
            }

            return {
              ...song,
              upvotes,
              downvotes,
              netVotes: upvotes - downvotes,
              userVote: voteType,
            };
          }
          return song;
        }),
      })),
    );

    // Refresh data to ensure consistency
    setTimeout(fetchSetlists, 1000);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) {
      return "";
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) {
      return `${diff}s ago`;
    }
    if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    }
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getTopVotedSongs = () => {
    const allSongs: any[] = [];
    setlists.forEach((setlist) => {
      setlist.songs?.forEach((song: any) => {
        allSongs.push({
          id: song.id,
          title: song.song.title,
          artist: song.song.artist,
          netVotes: song.netVotes,
          upvotes: song.upvotes,
          downvotes: song.downvotes,
        });
      });
    });

    return allSongs.sort((a, b) => b.netVotes - a.netVotes);
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Alert className={cn(!isConnected && "border-red-200 bg-red-50")}>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            {isConnected ? (
              <>
                Live updates enabled • Last updated{" "}
                {formatLastUpdate(lastUpdate)}
                {isLive && (
                  <Badge variant="destructive" className="ml-2">
                    LIVE
                  </Badge>
                )}
              </>
            ) : (
              "Connection lost. Retrying..."
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
                      .map((song: any, index: number) => (
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
                                currentVote={song.userVote}
                                upvotes={song.upvotes}
                                downvotes={song.downvotes}
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
                                    song.netVotes > 0 && "text-green-600",
                                    song.netVotes < 0 && "text-red-600",
                                  )}
                                >
                                  {song.netVotes > 0 ? "+" : ""}
                                  {song.netVotes}
                                </span>
                              </div>
                            )}
                        </div>
                      ))}
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
