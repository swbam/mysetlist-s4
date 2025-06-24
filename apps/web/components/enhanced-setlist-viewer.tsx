'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Music, Clock, Users, Lock, Plus, Edit } from 'lucide-react';
import { RealtimeVoteButton } from './realtime-vote-button';
import { useRealtimeSetlist } from '@/hooks/use-realtime-setlist';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/design-system/lib/utils';

interface EnhancedSetlistViewerProps {
  showId: string;
  initialSetlist?: any;
  canEdit?: boolean;
  onAddSong?: () => void;
  onEditSetlist?: () => void;
}

export function EnhancedSetlistViewer({ 
  showId, 
  initialSetlist,
  canEdit = false,
  onAddSong,
  onEditSetlist
}: EnhancedSetlistViewerProps) {
  const { user } = useAuth();
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  
  // Use real-time setlist updates
  const { songs, isLoading } = useRealtimeSetlist({
    showId,
    setlistId: initialSetlist?.id,
  });

  const handleVote = async (songId: string, voteType: 'up' | 'down' | null) => {
    if (!user) return;

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlistSongId: songId,
          voteType,
        }),
      });

      if (!response.ok) throw new Error('Vote failed');
    } catch (error) {
      console.error('Vote failed:', error);
      throw error;
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalDuration = songs.reduce((acc, song) => acc + ((song.song as any)?.durationMs || (song.song as any)?.duration_ms || 0), 0);
  const totalVotes = songs.reduce((acc, song) => acc + ((song as any).upvotes || 0) + ((song as any).downvotes || 0), 0);

  if (isLoading && songs.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              {initialSetlist?.name || 'Community Setlist'}
              {initialSetlist?.type && (
                <Badge variant={initialSetlist.type === 'actual' ? 'default' : 'secondary'}>
                  {initialSetlist.type}
                </Badge>
              )}
              {initialSetlist?.isLocked && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{songs.length} songs</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.floor(totalDuration / 60000)}m
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalVotes} votes
              </span>
              {initialSetlist?.createdAt && (
                <>
                  <span>•</span>
                  <span>Updated {formatDistanceToNow(new Date(initialSetlist.updatedAt || initialSetlist.createdAt))} ago</span>
                </>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              {onAddSong && (
                <Button size="sm" variant="outline" onClick={onAddSong}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Song
                </Button>
              )}
              {onEditSetlist && (
                <Button size="sm" variant="outline" onClick={onEditSetlist}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {songs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No songs in the setlist yet</p>
            {canEdit && onAddSong && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={onAddSong}
              >
                Add Songs
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="divide-y">
              {songs.map((song, index) => (
                <motion.div
                  key={song.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                    selectedSongId === song.id && "bg-muted/50"
                  )}
                  onClick={() => setSelectedSongId(song.id)}
                >
                  {/* Position */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background text-sm font-medium border">
                    {song.position || index + 1}
                  </div>
                  
                  {/* Song Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{song.song?.title || 'Unknown Song'}</h4>
                      {song.is_cover && (
                        <Badge variant="secondary" className="text-xs">
                          Cover
                        </Badge>
                      )}
                      {song.is_debut && (
                        <Badge variant="default" className="text-xs bg-yellow-500">
                          Debut
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{(song.song as any)?.artist || 'Unknown Artist'}</span>
                      {((song.song as any)?.durationMs || (song.song as any)?.duration_ms) && (
                        <>
                          <span>•</span>
                          <span>{formatDuration((song.song as any)?.durationMs || (song.song as any)?.duration_ms)}</span>
                        </>
                      )}
                      {song.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">{song.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Voting */}
                  {user && !initialSetlist?.isLocked && (
                    <RealtimeVoteButton
                      songId={song.id}
                      onVote={handleVote}
                      disabled={!user}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}