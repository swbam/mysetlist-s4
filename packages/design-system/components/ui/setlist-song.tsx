'use client';

import { Badge } from './badge';
import { VoteButton } from './vote-button';
import { Music, Clock, Star, Play } from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';

interface SetlistSongProps {
  song: {
    id: string;
    title: string;
    artist?: string;
    duration?: number;
    position: number;
    isCover?: boolean;
    isDebut?: boolean;
    notes?: string;
  };
  votes?: {
    upvotes: number;
    downvotes: number;
    userVote?: 'up' | 'down' | null;
  };
  onVote?: (songId: string, voteType: 'up' | 'down' | null) => Promise<void>;
  isPlaying?: boolean;
  canVote?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function SetlistSong({ 
  song, 
  votes, 
  onVote, 
  isPlaying = false, 
  canVote = true,
  variant = 'default' 
}: SetlistSongProps) {
  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      'group flex items-center gap-3 p-3 rounded-lg border transition-all',
      isPlaying && 'bg-primary/5 border-primary/20',
      'hover:bg-muted/50'
    )}>
      {/* Position */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
        {isPlaying ? (
          <Play className="h-4 w-4 text-primary" />
        ) : (
          song.position
        )}
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn(
            'font-medium truncate',
            isPlaying && 'text-primary'
          )}>
            {song.title}
          </h4>
          {song.isCover && (
            <Badge variant="secondary" className="text-xs">
              Cover
            </Badge>
          )}
          {song.isDebut && (
            <Badge variant="default" className="text-xs bg-yellow-500">
              <Star className="h-3 w-3 mr-1" />
              Debut
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {song.artist && (
            <>
              <Music className="h-3 w-3" />
              <span>{song.artist}</span>
            </>
          )}
          {song.duration && (
            <>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{formatDuration(song.duration)}</span>
            </>
          )}
        </div>
        
        {song.notes && (
          <p className="text-sm text-muted-foreground italic mt-1">
            {song.notes}
          </p>
        )}
      </div>

      {/* Voting */}
      {votes && onVote && canVote && (
        <VoteButton
          songId={song.id}
          currentVote={votes.userVote}
          upvotes={votes.upvotes}
          downvotes={votes.downvotes}
          onVote={onVote}
          disabled={!canVote}
        />
      )}
    </div>
  );
} 