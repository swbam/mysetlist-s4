'use client';

import { useAuth } from '@/app/providers/auth-provider';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { Button } from '@repo/design-system/components/ui/button';
import { cn } from '@repo/design-system/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface RealtimeVoteButtonProps {
  songId: string;
  onVote: (songId: string, voteType: 'up' | 'down' | null) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function RealtimeVoteButton({
  songId,
  onVote,
  disabled = false,
  className,
}: RealtimeVoteButtonProps) {
  const { session } = useAuth();
  const [isVoting, setIsVoting] = useState(false);

  // Use real-time voting hook for live updates
  const { votes } = useRealtimeVotes({
    songId,
    userId: session?.user?.id,
  });

  const netVotes = votes.upvotes - votes.downvotes;

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting || disabled) return;

    if (!session) {
      toast.error('Please sign in to vote');
      return;
    }

    setIsVoting(true);
    try {
      // Toggle vote if same type, otherwise switch
      const newVote = votes.userVote === voteType ? null : voteType;
      await onVote(songId, newVote);
    } catch (error) {
      console.error('Vote failed:', error);
      toast.error('Failed to vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('up')}
        disabled={isVoting || disabled}
        className={cn(
          'h-8 w-8 p-0 transition-all',
          votes.userVote === 'up' &&
            'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
        )}
        aria-label={`Upvote (${votes.upvotes} upvotes)`}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <span
        className={cn(
          'min-w-[2rem] text-center font-medium text-sm tabular-nums',
          netVotes > 0 && 'text-green-600 dark:text-green-400',
          netVotes < 0 && 'text-red-600 dark:text-red-400',
          netVotes === 0 && 'text-muted-foreground'
        )}
      >
        {netVotes > 0 ? `+${netVotes}` : netVotes}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('down')}
        disabled={isVoting || disabled}
        className={cn(
          'h-8 w-8 p-0 transition-all',
          votes.userVote === 'down' &&
            'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
        )}
        aria-label={`Downvote (${votes.downvotes} downvotes)`}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
