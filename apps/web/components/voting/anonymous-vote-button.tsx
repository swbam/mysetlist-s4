'use client';

import { anonymousUser } from '@/lib/anonymous-user';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/design-system/components/ui/tooltip';
import { cn } from '@repo/design-system/lib/utils';
import { ChevronDown, ChevronUp, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

interface AnonymousVoteButtonProps {
  setlistSongId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  isAuthenticated: boolean;
  onVote?: (voteType: 'up' | 'down' | null) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export function AnonymousVoteButton({
  setlistSongId,
  initialUpvotes,
  initialDownvotes,
  isAuthenticated,
  onVote,
  disabled = false,
  size = 'md',
  variant = 'default',
}: AnonymousVoteButtonProps) {
  const router = useRouter();
  const [isVoting, setIsVoting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(null);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [canVote, setCanVote] = useState(true);

  const netVotes = upvotes - downvotes;

  useEffect(() => {
    // Check if user has already voted on this song
    if (!isAuthenticated) {
      const vote = anonymousUser.getVote(setlistSongId);
      setCurrentVote(vote);
      setCanVote(anonymousUser.canVote() || vote !== null);
    }
  }, [setlistSongId, isAuthenticated]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting || disabled || isPending) return;

    // If not authenticated and can't vote, prompt to sign up
    if (!isAuthenticated && !canVote && currentVote === null) {
      toast.error("You've used your free vote! Sign up to vote more.", {
        action: {
          label: 'Sign Up',
          onClick: () => router.push('/auth/sign-up'),
        },
      });
      return;
    }

    setIsVoting(true);

    startTransition(async () => {
      try {
        const newVote = currentVote === voteType ? null : voteType;

        if (isAuthenticated && onVote) {
          // Authenticated user flow
          await onVote(newVote);
        } else if (isAuthenticated) {
          // Authenticated user with default API
          const response = await fetch('/api/votes', {
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
            throw new Error('Failed to vote');
          }

          const data = await response.json();
          setUpvotes(data.upvotes);
          setDownvotes(data.downvotes);
          setCurrentVote(data.userVote);
        } else {
          // Anonymous user flow
          if (newVote === null) {
            // Removing vote
            anonymousUser.removeVote(setlistSongId);

            // Update local state
            if (currentVote === 'up') {
              setUpvotes((prev) => Math.max(0, prev - 1));
            } else if (currentVote === 'down') {
              setDownvotes((prev) => Math.max(0, prev - 1));
            }
          } else {
            // Adding or changing vote
            const success = anonymousUser.addVote(setlistSongId, newVote);

            if (!success) {
              toast.error("You've used your free vote! Sign up to vote more.", {
                action: {
                  label: 'Sign Up',
                  onClick: () => router.push('/auth/sign-up'),
                },
              });
              return;
            }

            // Update local state optimistically
            if (currentVote === 'up') {
              setUpvotes((prev) => Math.max(0, prev - 1));
            } else if (currentVote === 'down') {
              setDownvotes((prev) => Math.max(0, prev - 1));
            }

            if (newVote === 'up') {
              setUpvotes((prev) => prev + 1);
            } else if (newVote === 'down') {
              setDownvotes((prev) => prev + 1);
            }
          }

          setCurrentVote(newVote);
          setCanVote(anonymousUser.canVote() || newVote !== null);

          // Show toast for anonymous users
          if (
            newVote !== null &&
            anonymousUser.getRemainingVotes() === 0 &&
            currentVote === null
          ) {
            toast.success('Vote recorded! Sign up to vote on more songs.', {
              action: {
                label: 'Sign Up',
                onClick: () => router.push('/auth/sign-up'),
              },
            });
          }
        }
      } catch (error) {
        console.error('Vote failed:', error);
        toast.error('Failed to vote');
      } finally {
        setIsVoting(false);
      }
    });
  };

  const buttonSize =
    size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const iconSize =
    size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  const VoteButtonContent = ({ type }: { type: 'up' | 'down' }) => {
    const isActive = currentVote === type;
    const isDisabled =
      isVoting ||
      disabled ||
      isPending ||
      (!isAuthenticated && !canVote && currentVote === null);

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(type)}
        disabled={isDisabled}
        className={cn(
          buttonSize,
          'relative p-0',
          isActive &&
            type === 'up' &&
            'bg-green-100 text-green-700 hover:bg-green-200',
          isActive &&
            type === 'down' &&
            'bg-red-100 text-red-700 hover:bg-red-200',
          !isAuthenticated && !canVote && currentVote === null && 'opacity-50'
        )}
      >
        {isVoting && currentVote === type ? (
          <Loader2 className={cn(iconSize, 'animate-spin')} />
        ) : type === 'up' ? (
          <ChevronUp className={iconSize} />
        ) : (
          <ChevronDown className={iconSize} />
        )}
        {!isAuthenticated && !canVote && currentVote === null && (
          <Lock className="-top-1 -right-1 absolute h-2 w-2" />
        )}
      </Button>
    );
  };

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {!isAuthenticated && (canVote || currentVote !== null) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <VoteButtonContent type="up" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Anonymous vote ({anonymousUser.getRemainingVotes()} remaining)
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <VoteButtonContent type="up" />
          )}

          <span
            className={cn(
              'min-w-[2rem] text-center font-medium text-sm',
              netVotes > 0 && 'text-green-600',
              netVotes < 0 && 'text-red-600',
              netVotes === 0 && 'text-muted-foreground'
            )}
          >
            {netVotes > 0 ? `+${netVotes}` : netVotes}
          </span>

          {!isAuthenticated && (canVote || currentVote !== null) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <VoteButtonContent type="down" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Anonymous vote ({anonymousUser.getRemainingVotes()} remaining)
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <VoteButtonContent type="down" />
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-1">
        {!isAuthenticated && (canVote || currentVote !== null) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <VoteButtonContent type="up" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Anonymous vote ({anonymousUser.getRemainingVotes()} remaining)
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <VoteButtonContent type="up" />
        )}

        <span
          className={cn(
            'font-medium text-sm',
            netVotes > 0 && 'text-green-600',
            netVotes < 0 && 'text-red-600',
            netVotes === 0 && 'text-muted-foreground'
          )}
        >
          {netVotes > 0 ? `+${netVotes}` : netVotes}
        </span>

        {!isAuthenticated && (canVote || currentVote !== null) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <VoteButtonContent type="down" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Anonymous vote ({anonymousUser.getRemainingVotes()} remaining)
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <VoteButtonContent type="down" />
        )}
      </div>
    </TooltipProvider>
  );
}
