'use client';

import { useState, useEffect } from 'react';
import { Music2, Users, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';
import { cn } from '@repo/design-system/lib/utils';
import { VoteButton } from '../voting/vote-button';
import { VoteSummary } from '../voting/vote-summary';
import { useAuth } from '@/app/providers/auth-provider';
import Image from 'next/image';

interface SetlistSong {
  id: string;
  position: number;
  song: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArtUrl?: string;
    durationMs?: number;
    isExplicit?: boolean;
  };
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
  isPlayed?: boolean;
  playTime?: string;
}

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
        throw new Error('Failed to fetch setlists');
      }

      const data = await response.json();
      setSetlists(data.setlists || []);
      setLastUpdate(new Date());
      setIsConnected(true);

      // Calculate total votes
      const votes = data.setlists.reduce((acc: any, setlist: any) => {
        setlist.songs?.forEach((song: any) => {
          acc.total += song.upvotes + song.downvotes;
          acc.upvotes += song.upvotes;
          acc.downvotes += song.downvotes;
        });
        return acc;
      }, { total: 0, upvotes: 0, downvotes: 0 });

      setTotalVotes(votes);
    } catch (error) {
      console.error('Failed to fetch setlists:', error);
      setIsConnected(false);
    }
  };

  const handleVote = async (setlistSongId: string, voteType: 'up' | 'down' | null) => {
    try {
      const response = await fetch('/api/songs/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setlistSongId,
          voteType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      // Optimistically update local state
      setSetlists(currentSetlists =>
        currentSetlists.map(setlist => ({
          ...setlist,
          songs: setlist.songs?.map((song: any) => {
            if (song.id === setlistSongId) {
              const currentVote = song.userVote;
              let upvotes = song.upvotes;
              let downvotes = song.downvotes;

              // Remove previous vote
              if (currentVote === 'up') upvotes--;
              if (currentVote === 'down') downvotes--;

              // Add new vote
              if (voteType === 'up') upvotes++;
              if (voteType === 'down') downvotes++;

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
        }))
      );

      // Refresh data to ensure consistency
      setTimeout(fetchSetlists, 1000);
    } catch (error) {
      console.error('Vote error:', error);
      throw error;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getTopVotedSongs = () => {
    const allSongs: any[] = [];
    setlists.forEach(setlist => {
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
                Live updates enabled • Last updated {formatLastUpdate(lastUpdate)}
                {isLive && <Badge variant="destructive" className="ml-2">LIVE</Badge>}
              </>
            ) : (
              "Connection lost. Retrying..."
            )}
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Setlists */}
        <div className="lg:col-span-3 space-y-4">
          {setlists.map((setlist) => (
            <Card key={setlist.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Music2 className="h-5 w-5" />
                    {setlist.name}
                    <Badge variant={setlist.type === 'actual' ? 'default' : 'secondary'}>
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
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          "hover:bg-muted/50",
                          song.isPlayed && "bg-green-50 border-green-200 border"
                        )}
                      >
                        {/* Position */}
                        <div className="w-8 text-center text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        
                        {/* Album Art */}
                        <div className="relative w-10 h-10 rounded bg-muted flex-shrink-0">
                          {song.song.albumArtUrl ? (
                            <Image
                              src={song.song.albumArtUrl}
                              alt={song.song.album || song.song.title}
                              fill
                              className="object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{song.song.title}</h4>
                            {song.song.isExplicit && (
                              <Badge variant="outline" className="text-xs">E</Badge>
                            )}
                            {song.isPlayed && (
                              <Badge variant="default" className="text-xs">Played</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">{song.song.artist}</span>
                            {song.song.album && (
                              <>
                                <span>•</span>
                                <span className="truncate">{song.song.album}</span>
                              </>
                            )}
                            {song.song.durationMs && (
                              <>
                                <span>•</span>
                                <span>{formatDuration(song.song.durationMs)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Voting */}
                        {showVotes && session && !setlist.isLocked && setlist.type === 'predicted' && (
                          <VoteButton
                            setlistSongId={song.id}
                            currentVote={song.userVote}
                            upvotes={song.upvotes}
                            downvotes={song.downvotes}
                            onVote={(voteType) => handleVote(song.id, voteType)}
                            variant="compact"
                            size="sm"
                          />
                        )}
                        
                        {/* Vote Count (read-only) */}
                        {showVotes && (!session || setlist.isLocked || setlist.type === 'actual') && (
                          <div className="flex items-center gap-1 text-sm">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className={cn(
                              "font-medium",
                              song.netVotes > 0 && "text-green-600",
                              song.netVotes < 0 && "text-red-600"
                            )}>
                              {song.netVotes > 0 ? '+' : ''}{song.netVotes}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No songs added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {setlists.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Music2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No setlists yet</h3>
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