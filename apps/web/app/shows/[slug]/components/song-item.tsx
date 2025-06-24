'use client';

import { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { 
  GripVertical, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2,
  Music,
  ExternalLink
} from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { cn } from '@repo/design-system/lib/utils';
import { voteSong } from '../actions';
import { toast } from 'sonner';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { useAuth } from '@/app/providers/auth-provider';

type SongItemProps = {
  item: any;
  index: number;
  isEditing: boolean;
  canVote: boolean;
  onDelete: () => void;
};

export function SongItem({ item, index, isEditing, canVote, onDelete }: SongItemProps) {
  const { session } = useAuth();
  const [isPending, startTransition] = useTransition();
  
  // Use real-time voting hook
  const { votes } = useRealtimeVotes({
    songId: item.id,
    userId: session?.user?.id,
    onVoteChange: (newVotes) => {
      // Update will be handled by the hook
    }
  });
  
  const netVotes = votes.upvotes - votes.downvotes;
  
  const song = item.song;
  const position = index + 1;
  
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handleVote = (voteType: 'up' | 'down') => {
    if (!canVote) return;
    
    startTransition(async () => {
      try {
        // The vote action will trigger real-time updates
        await voteSong(item.id, voteType);
        // Don't manually update state - real-time hook will handle it
      } catch (error: any) {
        if (error.message.includes('logged in')) {
          toast.error('Please sign in to vote');
        } else {
          toast.error('Failed to vote');
        }
      }
    });
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        "hover:bg-muted/50",
        isEditing && "cursor-move"
      )}
    >
      {/* Drag Handle */}
      {isEditing && (
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      )}
      
      {/* Position */}
      <div className="w-8 text-center text-sm font-medium text-muted-foreground">
        {position}
      </div>
      
      {/* Album Art */}
      <div className="relative w-10 h-10 rounded bg-muted flex-shrink-0">
        {song.album_art_url ? (
          <Image
            src={song.album_art_url}
            alt={song.album || song.title}
            fill
            className="object-cover rounded"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{song.title}</h4>
          {item.notes && (
            <Badge variant="secondary" className="text-xs">
              {item.notes}
            </Badge>
          )}
          {song.is_explicit && (
            <Badge variant="outline" className="text-xs">
              E
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">{song.artist}</span>
          {song.album && (
            <>
              <span>•</span>
              <span className="truncate">{song.album}</span>
            </>
          )}
          {song.duration_ms && (
            <>
              <span>•</span>
              <span>{formatDuration(song.duration_ms)}</span>
            </>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Voting */}
        {canVote && !isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                votes.userVote === 'up' && "text-green-600"
              )}
              onClick={() => handleVote('up')}
              disabled={isPending}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <span className={cn(
              "text-sm font-medium min-w-[2ch] text-center",
              netVotes > 0 && "text-green-600",
              netVotes < 0 && "text-red-600"
            )}>
              {netVotes > 0 && '+'}{netVotes}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                votes.userVote === 'down' && "text-red-600"
              )}
              onClick={() => handleVote('down')}
              disabled={isPending}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {/* Spotify Link */}
        {song.spotify_id && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            asChild
          >
            <a
              href={`https://open.spotify.com/track/${song.spotify_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
        
        {/* Delete */}
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}