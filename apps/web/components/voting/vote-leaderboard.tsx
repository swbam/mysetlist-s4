"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { cn } from "@repo/design-system/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Crown,
  Medal,
  Music,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface VoteLeaderboardProps {
  showId: string;
  setlistId?: string;
  className?: string;
}

interface TopVoter {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  totalVotes: number;
  upvotes: number;
  downvotes: number;
  rank: number;
  streakDays?: number;
  joinedDate?: string;
}

interface TopSong {
  id: string;
  title: string;
  artist: string;
  netVotes: number;
  upvotes: number;
  downvotes: number;
  totalVotes: number;
  rank: number;
  albumArt?: string;
  spotifyId?: string;
}

interface LeaderboardData {
  topVoters: TopVoter[];
  topSongs: TopSong[];
  mostDebated: TopSong[];
  risingStars: TopVoter[];
}

export function VoteLeaderboard({
  showId,
  setlistId,
  className,
}: VoteLeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const params = new URLSearchParams({ showId });
        if (setlistId) {
          params.set("setlistId", setlistId);
        }

        const response = await fetch(`/api/votes/leaderboard?${params}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [showId, setlistId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...new Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Trophy className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>No leaderboard data available</p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return (
          <span className="font-bold text-muted-foreground text-sm">
            #{rank}
          </span>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-500/20 bg-yellow-50 dark:bg-yellow-900/10";
      case 2:
        return "border-gray-400/20 bg-gray-50 dark:bg-gray-900/10";
      case 3:
        return "border-amber-600/20 bg-amber-50 dark:bg-amber-900/10";
      default:
        return "border-muted";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboards
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="voters" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="voters" className="text-xs">
              Top Voters
            </TabsTrigger>
            <TabsTrigger value="songs" className="text-xs">
              Top Songs
            </TabsTrigger>
            <TabsTrigger value="debated" className="text-xs">
              Most Debated
            </TabsTrigger>
            <TabsTrigger value="rising" className="text-xs">
              Rising Stars
            </TabsTrigger>
          </TabsList>

          {/* Top Voters */}
          <TabsContent value="voters" className="mt-4">
            <div className="space-y-3">
              <AnimatePresence>
                {data.topVoters.slice(0, 10).map((voter, index) => (
                  <motion.div
                    key={voter.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      getRankColor(voter.rank),
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center">
                      {getRankIcon(voter.rank)}
                    </div>

                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={voter.avatarUrl}
                        alt={voter.displayName || voter.username}
                      />
                      <AvatarFallback>
                        {(voter.displayName || voter.username || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {voter.displayName || voter.username || "Anonymous"}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {voter.upvotes} up, {voter.downvotes} down
                        {voter.streakDays && voter.streakDays > 1 && (
                          <span className="ml-2">
                            🔥 {voter.streakDays} day streak
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant="secondary" className="font-bold">
                      {voter.totalVotes}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>

              {data.topVoters.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No voters yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Top Songs */}
          <TabsContent value="songs" className="mt-4">
            <div className="space-y-3">
              <AnimatePresence>
                {data.topSongs.slice(0, 10).map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      getRankColor(song.rank),
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center">
                      {getRankIcon(song.rank)}
                    </div>

                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted">
                      {song.albumArt ? (
                        <img
                          src={song.albumArt}
                          alt={song.title}
                          className="h-full w-full rounded object-cover"
                        />
                      ) : (
                        <Music className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{song.title}</div>
                      <div className="truncate text-muted-foreground text-sm">
                        {song.artist}
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={
                          song.netVotes > 0
                            ? "default"
                            : song.netVotes < 0
                              ? "destructive"
                              : "secondary"
                        }
                        className="font-bold"
                      >
                        {song.netVotes > 0 ? "+" : ""}
                        {song.netVotes}
                      </Badge>
                      <div className="mt-1 text-muted-foreground text-xs">
                        {song.totalVotes} votes
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {data.topSongs.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  <Music className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No songs voted on yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Most Debated */}
          <TabsContent value="debated" className="mt-4">
            <div className="space-y-3">
              <div className="mb-3 text-muted-foreground text-sm">
                Songs with the most total votes (controversial picks)
              </div>

              <AnimatePresence>
                {data.mostDebated.slice(0, 10).map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600 text-sm dark:bg-orange-900/30">
                      #{index + 1}
                    </div>

                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted">
                      {song.albumArt ? (
                        <img
                          src={song.albumArt}
                          alt={song.title}
                          className="h-full w-full rounded object-cover"
                        />
                      ) : (
                        <Music className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{song.title}</div>
                      <div className="truncate text-muted-foreground text-sm">
                        {song.artist}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-orange-600 text-sm">
                        {song.totalVotes} votes
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {song.upvotes}↑ {song.downvotes}↓
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {data.mostDebated.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  <TrendingUp className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No controversial songs yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Rising Stars */}
          <TabsContent value="rising" className="mt-4">
            <div className="space-y-3">
              <div className="mb-3 text-muted-foreground text-sm">
                New voters making an impact
              </div>

              <AnimatePresence>
                {data.risingStars.slice(0, 10).map((voter, index) => (
                  <motion.div
                    key={voter.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 rounded-lg border border-blue-200/50 bg-blue-50/50 p-3 dark:bg-blue-900/10"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                      <Star className="h-4 w-4" />
                    </div>

                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={voter.avatarUrl}
                        alt={voter.displayName || voter.username}
                      />
                      <AvatarFallback>
                        {(voter.displayName || voter.username || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {voter.displayName || voter.username || "Anonymous"}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {voter.totalVotes} votes
                        {voter.joinedDate && (
                          <span className="ml-2">
                            Joined{" "}
                            {new Date(voter.joinedDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="border-blue-200 text-blue-700"
                    >
                      Rising ⭐
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>

              {data.risingStars.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  <Star className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No rising stars yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
