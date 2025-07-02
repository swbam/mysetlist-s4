'use client';

import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Award,
  TrendingUp,
  Crown,
  Star,
  Users,
  Music
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { cn } from '@repo/design-system/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

export function VoteLeaderboard({ showId, setlistId, className }: VoteLeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const params = new URLSearchParams({ showId });
        if (setlistId) params.set('setlistId', setlistId);
        
        const response = await fetch(`/api/votes/leaderboard?${params}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
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
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-6 w-12 bg-muted animate-pulse rounded" />
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
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
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
            <TabsTrigger value="voters" className="text-xs">Top Voters</TabsTrigger>
            <TabsTrigger value="songs" className="text-xs">Top Songs</TabsTrigger>
            <TabsTrigger value="debated" className="text-xs">Most Debated</TabsTrigger>
            <TabsTrigger value="rising" className="text-xs">Rising Stars</TabsTrigger>
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
                      "flex items-center gap-3 p-3 rounded-lg border",
                      getRankColor(voter.rank)
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(voter.rank)}
                    </div>
                    
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={voter.avatarUrl} alt={voter.displayName || voter.username} />
                      <AvatarFallback>
                        {(voter.displayName || voter.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {voter.displayName || voter.username || 'Anonymous'}
                      </div>
                      <div className="text-sm text-muted-foreground">
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
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
                      "flex items-center gap-3 p-3 rounded-lg border",
                      getRankColor(song.rank)
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(song.rank)}
                    </div>
                    
                    <div className="w-8 h-8 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                      {song.albumArt ? (
                        <img 
                          src={song.albumArt} 
                          alt={song.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{song.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge 
                        variant={song.netVotes > 0 ? "default" : song.netVotes < 0 ? "destructive" : "secondary"}
                        className="font-bold"
                      >
                        {song.netVotes > 0 ? '+' : ''}{song.netVotes}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {song.totalVotes} votes
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {data.topSongs.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No songs voted on yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Most Debated */}
          <TabsContent value="debated" className="mt-4">
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-3">
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
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-sm font-bold">
                      #{index + 1}
                    </div>
                    
                    <div className="w-8 h-8 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                      {song.albumArt ? (
                        <img 
                          src={song.albumArt} 
                          alt={song.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{song.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-semibold text-orange-600">
                        {song.totalVotes} votes
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {song.upvotes}↑ {song.downvotes}↓
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {data.mostDebated.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No controversial songs yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Rising Stars */}
          <TabsContent value="rising" className="mt-4">
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-3">
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
                    className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                      <Star className="h-4 w-4" />
                    </div>
                    
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={voter.avatarUrl} alt={voter.displayName || voter.username} />
                      <AvatarFallback>
                        {(voter.displayName || voter.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {voter.displayName || voter.username || 'Anonymous'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {voter.totalVotes} votes
                        {voter.joinedDate && (
                          <span className="ml-2">
                            Joined {new Date(voter.joinedDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="border-blue-200 text-blue-700">
                      Rising ⭐
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {data.risingStars.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
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