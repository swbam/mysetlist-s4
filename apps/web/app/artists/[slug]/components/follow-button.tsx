'use client';

import { useAuth } from '@/app/providers/auth-provider';
import { Button } from '@repo/design-system';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FollowButtonProps {
  artistId: string;
  artistName: string;
}

export function FollowButton({ artistId, artistName }: FollowButtonProps) {
  const { user } = useAuth();
  const isSignedIn = !!user;
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      checkFollowStatus();
    }
  }, [isSignedIn, artistId]);

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/artists/${artistId}/follow`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!isSignedIn) {
      toast.error('Please sign in to follow artists');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        toast.success(
          isFollowing
            ? `Unfollowed ${artistName}`
            : `Now following ${artistName}`
        );
      } else {
        throw new Error('Failed to update follow status');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.error('Please sign in to follow artists')}
      >
        <Heart className="mr-2 h-4 w-4" />
        Follow
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'default' : 'outline'}
      size="sm"
      onClick={handleFollowToggle}
      disabled={isLoading}
    >
      <Heart className={`mr-2 h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
      {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
