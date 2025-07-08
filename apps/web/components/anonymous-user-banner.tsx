'use client';

import { anonymousUser } from '@/lib/anonymous-user';
import { Button } from '@repo/design-system/components/ui/button';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AnonymousUserBannerProps {
  isAuthenticated: boolean;
}

export function AnonymousUserBanner({
  isAuthenticated,
}: AnonymousUserBannerProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [remainingVotes, setRemainingVotes] = useState(1);
  const [remainingSongs, setRemainingSongs] = useState(1);

  useEffect(() => {
    if (isAuthenticated) {
      setIsVisible(false);
      return;
    }

    const votes = anonymousUser.getRemainingVotes();
    const songs = anonymousUser.getRemainingSongs();

    setRemainingVotes(votes);
    setRemainingSongs(songs);

    // Show banner if user has used any of their limits
    if (votes < 1 || songs < 1) {
      setIsVisible(true);
    }
  }, [isAuthenticated]);

  if (!isVisible) return null;

  return (
    <div className="fixed right-4 bottom-4 left-4 z-50 md:right-4 md:left-auto md:max-w-sm">
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-2 font-semibold text-sm">Guest Limits</h3>
        <div className="mb-3 space-y-1 text-muted-foreground text-sm">
          <p>
            • {remainingVotes} vote{remainingVotes !== 1 ? 's' : ''} remaining
          </p>
          <p>
            • {remainingSongs} song addition{remainingSongs !== 1 ? 's' : ''}{' '}
            remaining
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => router.push('/auth/sign-up')}
            className="flex-1"
          >
            Sign Up
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/auth/sign-in')}
            className="flex-1"
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
