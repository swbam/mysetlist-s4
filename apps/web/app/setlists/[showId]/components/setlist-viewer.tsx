'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';
import { VoteButton } from '@repo/design-system';
import { Clock, Music, Sparkles, Play, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

type SetlistViewerProps = {
  showId: string;
};

type SetlistSong = {
  id: string;
  songId: string;
  position: number;
  song: {
    id: string;
    title: string;
    artist: string;
    durationMs?: number;
    albumArtUrl?: string;
  };
  notes?: string;
  isPlayed?: boolean;
  playTime?: Date;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
};

type Setlist = {
  id: string;
  name: string;
  type: 'predicted' | 'actual';
  songs: SetlistSong[];
};

export const SetlistViewer = ({ showId }: SetlistViewerProps) => {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSetlist, setActiveSetlist] = useState<string>('predicted');
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const subscriptionRef = useRef<any>(null);

  // Fetch setlists for the show
  useEffect(() => {
    const fetchSetlists = async () => {
      try {
        const response = await fetch(`/api/setlists/${showId}`);
        if (response.ok) {
          const data = await response.json();
          setSetlists(data.setlists || []);
        }
      } catch (error) {
        console.error('Failed to fetch setlists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSetlists();
  }, [showId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!showId) return;

    const setupRealtimeSubscription = async () => {
      try {
        // Subscribe to votes changes for this show
        const channel = supabase
          .channel(`setlist-${showId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'votes',
              filter: `setlist_song_id=in.(${setlists.flatMap(s => s.songs.map(song => song.id)).join(',')})`,
            },
            (payload) => {
              console.log('Vote update received:', payload);
              handleRealtimeVoteUpdate(payload);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'setlist_songs',
            },
            (payload) => {
              console.log('Setlist song update received:', payload);
              handleRealtimeSetlistUpdate(payload);
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
            setIsConnected(status === 'SUBSCRIBED');
            
            if (status === 'SUBSCRIBED') {
              console.log('🎵 Live Updates Connected - You\'ll see vote updates in real-time!');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setIsConnected(false);
              console.log('Connection Lost - Real-time updates temporarily unavailable');
            }
          });

        subscriptionRef.current = channel;
      } catch (error) {
        console.error('Failed to set up real-time subscription:', error);
        setIsConnected(false);
      }
    };

    if (setlists.length > 0) {
      setupRealtimeSubscription();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [showId, setlists]);

  const handleRealtimeVoteUpdate = (payload: any) => {
    // Refetch vote counts when votes change
    // In a production app, you'd want to be more granular here
    setTimeout(() => {
      fetch(`/api/setlists/${showId}`)
        .then(res => res.json())
        .then(data => {
          if (data.setlists) {
            setSetlists(data.setlists);
          }
        })
        .catch(console.error);
    }, 100);
  };

  const handleRealtimeSetlistUpdate = (payload: any) => {
    // Handle setlist song updates (like when a song is marked as played)
    if (payload.eventType === 'UPDATE') {
      setSetlists(prev => prev.map(setlist => ({
        ...setlist,
        songs: setlist.songs.map(song => 
          song.id === payload.new.id 
            ? {
                ...song,
                isPlayed: payload.new.is_played,
                playTime: payload.new.play_time ? new Date(payload.new.play_time) : undefined,
              }
            : song
        ),
      })));

      // Log when a song is played
      if (payload.new.is_played && !payload.old.is_played) {
        const song = setlists.flatMap(s => s.songs).find(s => s.id === payload.new.id);
        if (song) {
          console.log(`🎵 Now Playing: ${song.song.title} by ${song.song.artist}`);
        }
      }
    }
  };

  const currentSetlist = setlists.find(s => s.type === activeSetlist);

  const handleVote = async (setlistSongId: string, voteType: 'up' | 'down' | null) => {
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setlistSongId,
          voteType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Optimistically update local state
        setSetlists(prev => prev.map(setlist => ({
          ...setlist,
          songs: setlist.songs.map(song => 
            song.id === setlistSongId 
              ? {
                  ...song,
                  upvotes: result.upvotes,
                  downvotes: result.downvotes,
                  netVotes: result.netVotes,
                  userVote: result.userVote,
                }
              : song
          ),
        })));
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return '?:??';
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading setlist...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentSetlist || currentSetlist.songs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No setlist available</h3>
          <p className="text-muted-foreground">
            The setlist for this show hasn't been created yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const songs = currentSetlist.songs.sort((a, b) => a.position - b.position);
  const playedSongs = songs.filter(song => song.isPlayed).length;
  const progress = songs.length > 0 ? (playedSongs / songs.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {currentSetlist.name}
            {/* Real-time connection indicator */}
            <div className="flex items-center gap-1" title={isConnected ? "Live updates connected" : "No live updates"}>
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {playedSongs} of {songs.length} songs
          </Badge>
        </div>
        {progress > 0 && <Progress value={progress} className="mt-2" />}
        
        {/* Setlist Type Tabs */}
        {setlists.length > 1 && (
          <div className="flex gap-2 mt-4">
            {setlists.map((setlist) => (
              <button
                key={setlist.id}
                onClick={() => setActiveSetlist(setlist.type)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeSetlist === setlist.type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {setlist.type === 'predicted' ? 'Predicted' : 'Actual'}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {songs.map((setlistSong, index) => (
            <div 
              key={setlistSong.id} 
              className={`p-4 transition-colors ${
                setlistSong.isPlayed ? 'bg-green-50/50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-12">
                    <span className="text-lg font-bold text-muted-foreground">
                      {setlistSong.position}
                    </span>
                    {setlistSong.isPlayed && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{setlistSong.song.title}</h3>
                      {setlistSong.notes && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Sparkles className="h-3 w-3" />
                          {setlistSong.notes}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{setlistSong.song.artist}</span>
                      <span>•</span>
                      <span>{formatDuration(setlistSong.song.durationMs)}</span>
                      {setlistSong.playTime && (
                        <>
                          <span>•</span>
                          <span>Played at {new Date(setlistSong.playTime).toLocaleTimeString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <VoteButton
                    songId={setlistSong.id}
                    currentVote={setlistSong.userVote}
                    upvotes={setlistSong.upvotes}
                    downvotes={setlistSong.downvotes}
                    onVote={handleVote}
                    disabled={!setlistSong.isPlayed && currentSetlist.type === 'actual'}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};