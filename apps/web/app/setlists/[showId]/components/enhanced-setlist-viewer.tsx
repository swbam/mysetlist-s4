'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';
import { VoteButton } from '@repo/design-system';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';
import { Button } from '@repo/design-system/components/ui/button';
import { 
  Clock, 
  Music, 
  Sparkles, 
  CheckCircle, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Volume2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRealtimeSetlist } from '@/hooks/use-realtime-setlist';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/design-system/lib/utils';

type EnhancedSetlistViewerProps = {
  showId: string;
};

export const EnhancedSetlistViewer = ({ showId }: EnhancedSetlistViewerProps) => {
  const [activeSetlist, setActiveSetlist] = useState<string>('predicted');
  const [realtimeEvents, setRealtimeEvents] = useState<Array<{ id: string; message: string; timestamp: Date }>>([]);
  const [showEventNotifications, setShowEventNotifications] = useState(true);
  
  const { 
    setlists, 
    loading, 
    connectionStatus, 
    isConnected, 
    lastUpdate,
    refetch 
  } = useRealtimeSetlist({
    showId,
    onEvent: (event) => {
      // Handle real-time events
      let message = '';
      
      switch (event.type) {
        case 'song_played':
          const playedSong = setlists
            .flatMap(s => s.songs)
            .find(s => s.id === event.data.songId);
          if (playedSong) {
            message = `Now playing: ${playedSong.song.title}`;
          }
          break;
        case 'vote_update':
          message = 'Vote counts updated';
          break;
        case 'setlist_update':
          message = 'Setlist updated';
          break;
        case 'connection_change':
          if (event.data?.status === 'connected') {
            message = 'Live updates connected';
          }
          break;
      }
      
      if (message) {
        const newEvent = {
          id: Math.random().toString(36).substr(2, 9),
          message,
          timestamp: event.timestamp,
        };
        setRealtimeEvents(prev => [newEvent, ...prev].slice(0, 5));
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          setRealtimeEvents(prev => prev.filter(e => e.id !== newEvent.id));
        }, 5000);
      }
    },
  });

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

      if (!response.ok) {
        console.error('Vote failed');
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

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getConnectionMessage = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live updates active';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection error';
      default:
        return 'Disconnected';
    }
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
          <Button onClick={refetch} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const songs = currentSetlist.songs.sort((a, b) => a.position - b.position);
  const playedSongs = songs.filter(song => song.isPlayed).length;
  const progress = songs.length > 0 ? (playedSongs / songs.length) * 100 : 0;
  const currentlyPlaying = songs.find(s => s.isPlayed && songs.findIndex(song => song.isPlayed) === songs.lastIndexOf(s));

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
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                <span className="text-sm font-medium">{event.message}</span>
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
              {currentSetlist.name}
            </CardTitle>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div 
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted"
                title={getConnectionMessage()}
              >
                {getConnectionIcon()}
                <span className="text-xs font-medium">{getConnectionMessage()}</span>
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
            <div className="flex gap-2 mt-4">
              {setlists.map((setlist) => (
                <button
                  key={setlist.id}
                  onClick={() => setActiveSetlist(setlist.type)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    activeSetlist === setlist.type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {setlist.type === 'predicted' ? 'Predicted' : 'Actual'}
                </button>
              ))}
            </div>
          )}
          
          {/* Last Update Time */}
          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="divide-y">
            {songs.map((setlistSong) => {
              const isCurrentlyPlaying = currentlyPlaying?.id === setlistSong.id;
              
              return (
                <motion.div 
                  key={setlistSong.id}
                  layout
                  className={cn(
                    'p-4 transition-all duration-300',
                    setlistSong.isPlayed && 'bg-green-50/50 dark:bg-green-950/20',
                    isCurrentlyPlaying && 'bg-primary/5 border-l-4 border-primary'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-16">
                        <span className="text-lg font-bold text-muted-foreground">
                          {setlistSong.position}
                        </span>
                        {isCurrentlyPlaying && (
                          <PlayCircle className="h-5 w-5 text-primary animate-pulse" />
                        )}
                        {setlistSong.isPlayed && !isCurrentlyPlaying && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={cn(
                            'font-semibold transition-colors',
                            isCurrentlyPlaying && 'text-primary'
                          )}>
                            {setlistSong.song.title}
                          </h3>
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
                      {/* Album Art (if available) */}
                      {setlistSong.song.albumArtUrl && (
                        <img 
                          src={setlistSong.song.albumArtUrl} 
                          alt={`${setlistSong.song.title} album art`}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      
                      {/* Vote Button */}
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
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Connection Issues Alert */}
      {connectionStatus === 'error' && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Real-time updates are unavailable. The page will automatically reconnect when possible.
            You can also <Button variant="link" className="p-0 h-auto" onClick={refetch}>refresh manually</Button>.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};