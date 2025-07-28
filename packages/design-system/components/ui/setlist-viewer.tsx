"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { SetlistSong } from "./setlist-song";
import {
  Music,
  Clock,
  Users,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  MoreVertical,
  Share,
  Download,
  Edit,
  Lock,
  Unlock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "../../lib/utils";
import { musicTokens } from "../../lib/design-tokens";

interface SetlistSong {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  durationMs?: number | null;
  notes?: string | null;
  position: number;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  upvotes?: number;
  downvotes?: number;
  isPlayed?: boolean;
  isCurrentSong?: boolean;
}

interface SetlistViewerProps {
  setlist: {
    id: string;
    name: string;
    type: "predicted" | "actual" | "suggested";
    isLocked?: boolean;
    totalDuration?: number;
    voteCount?: number;
    songs: SetlistSong[];
    show?: {
      id: string;
      name: string;
      date: string;
      venue?: {
        name: string;
        city: string;
      };
    };
  };
  userVotes?: Record<string, "up" | "down">;
  onVote?: (songId: string, voteType: "up" | "down" | null) => Promise<void>;
  onPlay?: (songId: string) => void;
  onSongEdit?: (songId: string) => void;
  onSongDelete?: (songId: string) => void;
  onToggleLock?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  currentlyPlaying?: string | null;
  isEditable?: boolean;
  showVoting?: boolean;
  showPlayControls?: boolean;
  variant?: "default" | "compact" | "detailed";
  className?: string;
}

export function SetlistViewer({
  setlist,
  userVotes = {},
  onVote,
  onPlay,
  onSongEdit,
  onSongDelete,
  onToggleLock,
  onShare,
  onExport,
  currentlyPlaying,
  isEditable = false,
  showVoting = true,
  showPlayControls = false,
  variant = "default",
  className,
}: SetlistViewerProps) {
  const [localCurrentSong, setLocalCurrentSong] = useState<string | null>(
    currentlyPlaying,
  );
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setLocalCurrentSong(currentlyPlaying);
  }, [currentlyPlaying]);

  const formatTotalDuration = (totalMs?: number) => {
    if (!totalMs) return null;
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (!localCurrentSong && setlist.songs.length > 0) {
        const firstSong = setlist.songs[0];
        setLocalCurrentSong(firstSong.id);
        onPlay?.(firstSong.id);
      }
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (!localCurrentSong) return;

    const currentIndex = setlist.songs.findIndex(
      (song) => song.id === localCurrentSong,
    );
    if (currentIndex < setlist.songs.length - 1) {
      const nextSong = setlist.songs[currentIndex + 1];
      setLocalCurrentSong(nextSong.id);
      onPlay?.(nextSong.id);
    }
  };

  const handlePrevious = () => {
    if (!localCurrentSong) return;

    const currentIndex = setlist.songs.findIndex(
      (song) => song.id === localCurrentSong,
    );
    if (currentIndex > 0) {
      const prevSong = setlist.songs[currentIndex - 1];
      setLocalCurrentSong(prevSong.id);
      onPlay?.(prevSong.id);
    }
  };

  const getSetlistTypeColor = (type: string) => {
    switch (type) {
      case "actual":
        return "bg-green-100 text-green-800";
      case "predicted":
        return "bg-blue-100 text-blue-800";
      case "suggested":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSetlistTypeLabel = (type: string) => {
    switch (type) {
      case "actual":
        return "Actual Setlist";
      case "predicted":
        return "Predicted Setlist";
      case "suggested":
        return "Suggested Setlist";
      default:
        return "Setlist";
    }
  };

  // Enhanced songs with current playing state
  const enhancedSongs = setlist.songs.map((song) => ({
    ...song,
    isCurrentSong: song.id === localCurrentSong,
  }));

  if (variant === "compact") {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">{setlist.name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={getSetlistTypeColor(setlist.type)}
                  >
                    {getSetlistTypeLabel(setlist.type)}
                  </Badge>
                  <span>{setlist.songs.length} songs</span>
                  {setlist.totalDuration && (
                    <span>• {formatTotalDuration(setlist.totalDuration)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showPlayControls && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  className="gap-2"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onShare && (
                    <DropdownMenuItem onClick={onShare}>
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={onExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                  )}
                  {isEditable && (
                    <>
                      <DropdownMenuSeparator />
                      {onToggleLock && (
                        <DropdownMenuItem onClick={onToggleLock}>
                          {setlist.isLocked ? (
                            <>
                              <Unlock className="h-4 w-4 mr-2" />
                              Unlock Voting
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Lock Voting
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-2">
            {enhancedSongs.slice(0, 5).map((song) => (
              <SetlistSong
                key={song.id}
                song={song}
                currentVote={userVotes[song.id]}
                onVote={onVote}
                onPlay={onPlay}
                onEdit={onSongEdit}
                onDelete={onSongDelete}
                showVoting={showVoting && !setlist.isLocked}
                showActions={isEditable}
                isEditable={isEditable}
                variant="compact"
                disabled={setlist.isLocked}
              />
            ))}
            {setlist.songs.length > 5 && (
              <div className="text-center py-2 text-sm text-muted-foreground">
                +{setlist.songs.length - 5} more songs
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Music className="h-8 w-8 text-primary/60" />
              </div>
              <div>
                <CardTitle
                  className={cn(musicTokens.typography.showTitle, "mb-2")}
                >
                  {setlist.name}
                </CardTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={getSetlistTypeColor(setlist.type)}
                  >
                    {getSetlistTypeLabel(setlist.type)}
                  </Badge>
                  {setlist.isLocked && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    {setlist.songs.length} songs
                  </span>
                  {setlist.totalDuration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTotalDuration(setlist.totalDuration)}
                    </span>
                  )}
                  {setlist.voteCount && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {setlist.voteCount} votes
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showPlayControls && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={!localCurrentSong}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePlayPause}
                    className="gap-2"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!localCurrentSong}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <MoreVertical className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onShare && (
                    <DropdownMenuItem onClick={onShare}>
                      <Share className="h-4 w-4 mr-2" />
                      Share Setlist
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={onExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export to Spotify
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Shuffle className="h-4 w-4 mr-2" />
                    Shuffle Play
                  </DropdownMenuItem>
                  {isEditable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Setlist
                      </DropdownMenuItem>
                      {onToggleLock && (
                        <DropdownMenuItem onClick={onToggleLock}>
                          {setlist.isLocked ? (
                            <>
                              <Unlock className="h-4 w-4 mr-2" />
                              Unlock Voting
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Lock Voting
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Songs List */}
      <Card>
        <CardContent className="p-0">
          <div className={cn("space-y-1 p-6", musicTokens.spacing.setlistGap)}>
            {enhancedSongs.map((song) => (
              <SetlistSong
                key={song.id}
                song={song}
                currentVote={userVotes[song.id]}
                onVote={onVote}
                onPlay={onPlay}
                onEdit={onSongEdit}
                onDelete={onSongDelete}
                showVoting={showVoting && !setlist.isLocked}
                showActions={isEditable}
                isEditable={isEditable}
                variant={variant === "detailed" ? "detailed" : "default"}
                disabled={setlist.isLocked && setlist.type !== "actual"}
              />
            ))}

            {setlist.songs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-semibold mb-2">No songs yet</h3>
                <p className="text-sm">
                  {setlist.type === "predicted"
                    ? "Vote for songs you'd like to hear!"
                    : "Songs will appear here as they're added."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
