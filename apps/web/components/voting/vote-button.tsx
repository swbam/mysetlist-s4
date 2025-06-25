'use client';

import { useState, useTransition } from 'react';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { cn } from '@repo/design-system/lib/utils';
import { toast } from 'sonner';

interface VoteButtonProps {
  setlistSongId: string;
  currentVote?: 'up' | 'down' | null;
  upvotes: number;
  downvotes: number;
  onVote?: (voteType: 'up' | 'down' | null) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export function VoteButton({
  setlistSongId,
  currentVote,
  upvotes,
  downvotes,
  onVote,
  disabled = false,
  size = 'md',
  variant = 'default',
}: VoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const netVotes = upvotes - downvotes;

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting || disabled || isPending) return;
    
    setIsVoting(true);
    
    startTransition(async () => {
      try {
        // Toggle vote if same type, otherwise switch
        const newVote = currentVote === voteType ? null : voteType;
        
        if (onVote) {
          await onVote(newVote);
        } else {
          // Default API call
          const response = await fetch('/api/songs/votes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              setlistSongId,
              voteType: newVote,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to vote');
          }
        }
      } catch (error: any) {
        console.error('Vote failed:', error);
        if (error.message.includes('Unauthorized')) {
          toast.error('Please sign in to vote');
        } else {
          toast.error('Failed to vote');
        }
      } finally {
        setIsVoting(false);
      }
    });
  };

  const buttonSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('up')}
          disabled={isVoting || disabled || isPending}
          className={cn(
            buttonSize,
            'p-0',
            currentVote === 'up' && 'bg-green-100 text-green-700 hover:bg-green-200'
          )}
        >
          {isVoting && currentVote === 'up' ? (
            <Loader2 className={cn(iconSize, 'animate-spin')} />
          ) : (
            <ChevronUp className={iconSize} />
          )}
        </Button>
        
        <span className={cn(
          'text-sm font-medium min-w-[2rem] text-center',
          netVotes > 0 && 'text-green-600',
          netVotes < 0 && 'text-red-600',
          netVotes === 0 && 'text-muted-foreground'
        )}>
          {netVotes > 0 ? `+${netVotes}` : netVotes}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote('down')}
          disabled={isVoting || disabled || isPending}
          className={cn(
            buttonSize,
            'p-0',
            currentVote === 'down' && 'bg-red-100 text-red-700 hover:bg-red-200'
          )}
        >
          {isVoting && currentVote === 'down' ? (
            <Loader2 className={cn(iconSize, 'animate-spin')} />
          ) : (
            <ChevronDown className={iconSize} />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('up')}
        disabled={isVoting || disabled || isPending}
        className={cn(
          buttonSize,
          'p-0',
          currentVote === 'up' && 'bg-green-100 text-green-700 hover:bg-green-200'
        )}
      >
        {isVoting && currentVote === 'up' ? (
          <Loader2 className={cn(iconSize, 'animate-spin')} />
        ) : (
          <ChevronUp className={iconSize} />
        )}
      </Button>
      
      <span className={cn(
        'text-sm font-medium',
        netVotes > 0 && 'text-green-600',
        netVotes < 0 && 'text-red-600',
        netVotes === 0 && 'text-muted-foreground'
      )}>
        {netVotes > 0 ? `+${netVotes}` : netVotes}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('down')}
        disabled={isVoting || disabled || isPending}
        className={cn(
          buttonSize,
          'p-0',
          currentVote === 'down' && 'bg-red-100 text-red-700 hover:bg-red-200'
        )}
      >
        {isVoting && currentVote === 'down' ? (
          <Loader2 className={cn(iconSize, 'animate-spin')} />
        ) : (
          <ChevronDown className={iconSize} />
        )}
      </Button>
    </div>
  );
}