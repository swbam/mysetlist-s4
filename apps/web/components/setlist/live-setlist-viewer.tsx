'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, 
  Disc3, 
  Star, 
  Clock, 
  Users, 
  Wifi, 
  WifiOff,
  Eye,
  Heart,
  TrendingUp,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { cn } from '@repo/design-system/lib/utils';
import { useRealtimeSetlist } from '@/hooks/use-realtime-setlist';
import { useRealtimeConnection } from '@/app/providers/realtime-provider';
import { useAuth } from '@/app/providers/auth-provider';
import { RealtimeVoteButton } from '@/components/voting/realtime-vote-button';
import { toast } from 'sonner';

interface LiveSetlistViewerProps {
  showId: string;
  setlistId?: string;
  isLive?: boolean;
  showVotes?: boolean;
  showPresence?: boolean;
  autoScroll?: boolean;
  soundEffects?: boolean;
  className?: string;
}

interface SongWithVotes {
  id: string;
  position: number;
  song: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration_ms?: number;
    album_art_url?: string;
    spotify_id?: string;
  };
  notes?: string;
  is_cover?: boolean;
  is_debut?: boolean;
  is_played?: boolean;
  play_time?: Date;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: 'up' | 'down' | null;
}

export function LiveSetlistViewer({
  showId,
  setlistId,
  isLive = false,
  showVotes = true,
  showPresence = true,
  autoScroll = true,
  soundEffects = false,
  className,
}: LiveSetlistViewerProps) {
  const { session } = useAuth();
  const { isConnected, connectionStatus, joinShow, leaveShow, getShowAttendance } = useRealtimeConnection();
  
  // State for view preferences
  const [soundEnabled, setSoundEnabled] = useState(soundEffects);
  const [lastPlayedSong, setLastPlayedSong] = useState<string | null>(null);
  const [recentlyUpdatedSongs, setRecentlyUpdatedSongs] = useState<Set<string>>(new Set());
  
  // Real-time setlist data with event handling
  const { 
    songs, 
    isLoading, 
    connectionStatus: setlistConnectionStatus,
    lastUpdate 
  } = useRealtimeSetlist({
    showId,
    setlistId,
    onEvent: (event) => {
      switch (event.type) {
        case 'song_played':
          handleSongPlayed(event.data.songId);
          break;
        case 'vote_update':
          handleVoteUpdate(event.data);
          break;
        case 'setlist_update':
          handleSetlistUpdate(event.data);
          break;
      }
    },
  });

  // Join show presence when component mounts
  useEffect(() => {
    if (showPresence && showId && session?.user) {
      joinShow(showId);
      return () => leaveShow(showId);
    }
  }, [showId, showPresence, session?.user, joinShow, leaveShow]);

  // Handle song played events
  const handleSongPlayed = useCallback((songId: string) => {
    setLastPlayedSong(songId);
    
    // Play sound effect
    if (soundEnabled && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio('/sounds/song-start.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors (user interaction required)
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
    
    // Show toast notification
    const song = songs.find(s => s.id === songId);
    if (song?.song) {
      toast.success(`🎵 Now Playing: ${song.song.title}`, {
        description: `by ${song.song.artist}`,
        duration: 4000,
      });
    }
    
    // Auto-scroll to current song if enabled
    if (autoScroll) {
      const element = document.getElementById(`song-${songId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [songs, soundEnabled, autoScroll]);

  // Handle vote updates
  const handleVoteUpdate = useCallback((data: any) => {
    const songId = data.new?.setlist_song_id || data.old?.setlist_song_id;
    if (songId) {
      setRecentlyUpdatedSongs(prev => new Set(prev.add(songId)));
      
      // Clear highlight after animation
      setTimeout(() => {
        setRecentlyUpdatedSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(songId);
          return newSet;
        });
      }, 2000);
    }
  }, []);

  // Handle setlist structure updates
  const handleSetlistUpdate = useCallback((data: any) => {
    toast.info('Setlist updated', {
      description: 'New songs added to the setlist',
      duration: 2000,
    });
  }, []);

  // Get currently playing song
  const currentSong = useMemo(() => {
    if (!isLive) return null;
    return songs.find(song => song.is_played && song.play_time) || 
           songs[songs.length - 1]; // Fallback to last song
  }, [songs, isLive]);

  // Get attendance count
  const attendanceCount = showPresence ? getShowAttendance(showId) : 0;

  // Format duration helper
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading && songs.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  // Empty state
  if (songs.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <Music className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No songs in the setlist yet</p>
        {isLive && (
          <p className="text-sm text-muted-foreground mt-2">
            Songs will appear here as they're played
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">
              {isLive ? 'Live Setlist' : 'Setlist'}
            </h3>
            
            {isLive && (
              <Badge variant="destructive" className="animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-1 animate-ping" />
                LIVE
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Attendance counter */}
            {showPresence && attendanceCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{attendanceCount}</span>
              </div>
            )}
            
            {/* Sound toggle */}
            {isLive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 p-0"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {/* Connection indicator */}
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </div>
        
        {/* Last update time */}
        {lastUpdate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Clock className="h-3 w-3" />
            <span>Updated {lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Songs list */}
      <div className="max-h-[600px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {songs.map((song, index) => {
            const isCurrentlyPlaying = currentSong?.id === song.id;
            const isRecentlyUpdated = recentlyUpdatedSongs.has(song.id);
            const isJustPlayed = lastPlayedSong === song.id;
            
            return (
              <motion.div
                key={song.id}
                id={`song-${song.id}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  delay: index * 0.05
                }}
                className={cn(
                  "relative border-b border-muted/50 last:border-b-0 transition-all duration-300",
                  isCurrentlyPlaying && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                  isRecentlyUpdated && "bg-blue-50 dark:bg-blue-900/20",
                  isJustPlayed && "bg-yellow-50 dark:bg-yellow-900/20"
                )}
              >
                {/* Currently playing indicator */}
                {isCurrentlyPlaying && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    className="absolute top-0 left-0 h-1 bg-gradient-to-r from-green-500 to-green-600"
                  />
                )}
                
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Position indicator */}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0",
                      isCurrentlyPlaying 
                        ? "bg-green-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {song.position}
                    </div>
                    
                    {/* Album art */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      {song.song.album_art_url ? (
                        <img
                          src={song.song.album_art_url}
                          alt={song.song.album || song.song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Playing indicator overlay */}
                      {isCurrentlyPlaying && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Music className="h-4 w-4 text-green-600" />
                          </motion.div>
                        </div>
                      )}
                    </div>
                    
                    {/* Song details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium truncate">
                              {song.song.title}
                            </h4>
                            
                            {song.is_cover && (
                              <Badge variant="secondary" className="text-xs">
                                <Disc3 className="h-3 w-3 mr-1" />
                                Cover
                              </Badge>
                            )}
                            
                            {song.is_debut && (
                              <Badge variant="default" className="text-xs bg-yellow-500">
                                <Star className="h-3 w-3 mr-1" />
                                Debut
                              </Badge>
                            )}
                            
                            {isCurrentlyPlaying && (
                              <Badge variant="default" className="text-xs bg-green-500 animate-pulse">
                                <Volume2 className="h-3 w-3 mr-1" />
                                Now Playing
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="truncate">{song.song.artist}</span>
                            {song.song.album && (
                              <>
                                <span>•</span>
                                <span className="truncate">{song.song.album}</span>
                              </>
                            )}
                            {song.song.duration_ms && (
                              <>
                                <span>•</span>
                                <span>{formatDuration(song.song.duration_ms)}</span>
                              </>
                            )}
                          </div>
                          
                          {song.notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              {song.notes}
                            </p>
                          )}
                          
                          {song.play_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                              <Clock className="h-3 w-3" />
                              <span>Played at {new Date(song.play_time).toLocaleTimeString()}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Vote button */}
                        {showVotes && (
                          <div className="shrink-0">
                            <RealtimeVoteButton
                              setlistSongId={song.id}
                              showId={showId}
                              userId={session?.user?.id}
                              variant="compact"
                              size="sm"
                              showConnection={false}
                              hapticFeedback={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recent update flash */}
                {isRecentlyUpdated && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                    className="absolute inset-0 bg-blue-200/20 pointer-events-none"
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Footer stats */}
      <div className="p-4 border-t bg-muted/50">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{songs.length} songs</span>
            {songs.some(s => s.is_played) && (
              <span>{songs.filter(s => s.is_played).length} played</span>
            )}
            {showVotes && (
              <span>{songs.reduce((sum, s) => sum + s.upvotes + s.downvotes, 0)} votes</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isConnected && (
              <span className="text-warning">Offline mode</span>
            )}
            <span>Live updates {isConnected ? 'active' : 'paused'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}