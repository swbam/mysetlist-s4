'use client';

import { cn } from '@/lib/utils';
import { Button } from '@repo/design-system/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../app/providers/auth-provider';

interface FollowButtonProps {
  artistId: string;
  artistName: string;
  isFollowing?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  artistId,
  artistName,
  isFollowing = false,
  variant = 'default',
  size = 'default',
  showIcon = true,
  showText = true,
  className,
  onFollowChange,
}: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to sign-in
      window.location.href = '/auth/sign-in';
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: following ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }

      const newFollowingState = !following;
      setFollowing(newFollowingState);
      onFollowChange?.(newFollowingState);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <Loader2
            className={cn(
              'animate-spin',
              showText ? 'mr-2' : '',
              size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
            )}
          />
          {showText && (following ? 'Unfollowing...' : 'Following...')}
        </>
      );
    }

    if (following) {
      return (
        <>
          {showIcon && (
            <Heart
              className={cn(
                'fill-current',
                showText ? 'mr-2' : '',
                size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
              )}
            />
          )}
          {showText && 'Following'}
        </>
      );
    }

    return (
      <>
        {showIcon && (
          <Heart
            className={cn(
              showText ? 'mr-2' : '',
              size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
            )}
          />
        )}
        {showText && 'Follow'}
      </>
    );
  };

  const getButtonVariant = () => {
    if (following && variant === 'default') {
      return 'outline';
    }
    return variant;
  };

  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      onClick={handleToggleFollow}
      disabled={loading}
      className={cn(
        'transition-all duration-200',
        following &&
          variant === 'default' &&
          'border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50',
        className
      )}
      aria-label={following ? `Unfollow ${artistName}` : `Follow ${artistName}`}
    >
      {getButtonContent()}
    </Button>
  );
}

// Compact version for use in lists/cards
export function FollowButtonCompact(
  props: Omit<FollowButtonProps, 'showText' | 'size'>
) {
  return (
    <FollowButton
      {...props}
      showText={false}
      size="sm"
      className={cn('h-8 w-8 p-0', props.className)}
    />
  );
}

// Version with follower count
interface FollowButtonWithCountProps extends FollowButtonProps {
  followerCount?: number;
  showCount?: boolean;
}

export function FollowButtonWithCount({
  followerCount,
  showCount = true,
  ...props
}: FollowButtonWithCountProps) {
  const [currentCount, setCurrentCount] = useState(followerCount || 0);

  const handleFollowChange = (isFollowing: boolean) => {
    setCurrentCount((prev) => (isFollowing ? prev + 1 : prev - 1));
    props.onFollowChange?.(isFollowing);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="flex items-center gap-2">
      <FollowButton {...props} onFollowChange={handleFollowChange} />
      {showCount && (
        <span className="text-muted-foreground text-sm">
          {formatCount(currentCount)} followers
        </span>
      )}
    </div>
  );
}
