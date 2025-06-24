'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@repo/design-system/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';
import { toast } from 'sonner';

interface FollowButtonProps {
  artistId: string;
  artistName: string;
  initialFollowing?: boolean;
}

export function FollowButton({ artistId, artistName, initialFollowing = false }: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check current follow status
    checkFollowStatus();
  }, [artistId]);

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/artists/${artistId}/follow`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.following);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      if (response.status === 401) {
        toast.error('Please sign in to follow artists');
        router.push('/auth/sign-in');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update follow status');
      }

      const data = await response.json();
      setIsFollowing(data.following);
      
      toast.success(
        data.following 
          ? `You are now following ${artistName}` 
          : `You have unfollowed ${artistName}`
      );

      // Refresh the page to update follower count
      router.refresh();
    } catch (error) {
      console.error('Failed to follow/unfollow artist:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleFollow}
      disabled={isLoading}
      variant={isFollowing ? "default" : "outline"}
      className={cn(
        "gap-2",
        isFollowing && "bg-pink-600 hover:bg-pink-700"
      )}
    >
      <Heart className={cn(
        "h-4 w-4",
        isFollowing && "fill-current"
      )} />
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
} 