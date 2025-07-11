'use client';

import { useAuth } from '~/app/providers/auth-provider';
// import { SetlistViewer as UISetlistViewer } from '@repo/design-system';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Setlist } from '~/types/setlist';

interface Vote {
  userId: string;
  setlistSongId: string;
  voteType: 'up' | 'down';
}

interface SetlistViewerProps {
  showId: string;
  initialSetlist?: Setlist;
  realtime?: boolean;
}

export function SetlistViewer({
  showId,
  initialSetlist,
  realtime = true,
}: SetlistViewerProps) {
  const { user } = useAuth();
  const [setlist, setSetlist] = useState<Setlist | undefined>(initialSetlist);
  const [_userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [loading, setLoading] = useState(!initialSetlist);

  useEffect(() => {
    if (!initialSetlist) {
      fetchSetlist();
    }
    if (user) {
      fetchUserVotes();
    }
  }, [showId, user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!realtime || !showId) {
      return;
    }

    // Subscribe to setlist updates
    const eventSource = new EventSource(`/api/setlists/${showId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'setlist_update') {
        setSetlist(data.setlist);
      } else if (data.type === 'vote_update') {
        // Update specific song vote counts
        setSetlist((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            songs: prev.songs.map((song) =>
              song.id === data.songId
                ? { ...song, upvotes: data.upvotes, downvotes: data.downvotes }
                : song
            ),
          };
        });
      }
    };

    return () => eventSource.close();
  }, [showId, realtime]);

  const fetchSetlist = async () => {
    try {
      const response = await fetch(`/api/setlists/${showId}`);
      if (response.ok) {
        const data = await response.json();
        setSetlist(data);
      }
    } catch (_error) {
      toast.error('Failed to load setlist');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) {
      return;
    }

    try {
      const response = await fetch(`/api/votes?showId=${showId}`);
      if (response.ok) {
        const data = await response.json();
        const votesMap: Record<string, 'up' | 'down'> = {};
        data.votes?.forEach((vote: Vote) => {
          votesMap[vote.setlistSongId] = vote.voteType;
        });
        setUserVotes(votesMap);
      }
    } catch (_error) {}
  };

  return (
    // TODO: Implement SetlistViewer UI component
    <div>
      {loading && <div>Loading...</div>}
      {!loading && !setlist && <div>No setlist available</div>}
      {!loading && setlist && <div>SetlistViewer component not implemented</div>}
    </div>
  );
}