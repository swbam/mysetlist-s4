'use client';

import type { Setlist } from '@/types/setlist';
import { useAuth } from '@repo/auth';
import { SetlistViewer as UISetlistViewer } from '@repo/design-system';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});
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
    if (!realtime || !showId) return;

    // Subscribe to setlist updates
    const eventSource = new EventSource(`/api/setlists/${showId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'setlist_update') {
        setSetlist(data.setlist);
      } else if (data.type === 'vote_update') {
        // Update specific song vote counts
        setSetlist((prev) => {
          if (!prev) return prev;
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
    } catch (error) {
      console.error('Failed to fetch setlist:', error);
      toast.error('Failed to load setlist');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;

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
    } catch (error) {
      console.error('Failed to fetch user votes:', error);
    }
  };

  const handleVote = async (songId: string, voteType: 'up' | 'down' | null) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlistSongId: songId,
          voteType,
        }),
      });

      if (!response.ok) {
        throw new Error('Vote failed');
      }

      // Update local vote state
      setUserVotes((prev) => {
        const updated = { ...prev };
        if (voteType === null) {
          delete updated[songId];
        } else {
          updated[songId] = voteType;
        }
        return updated;
      });

      // Optimistically update vote counts
      setSetlist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          songs: prev.songs.map((song) => {
            if (song.id !== songId) return song;

            const currentVote = userVotes[songId];
            let upvotes = song.upvotes || 0;
            let downvotes = song.downvotes || 0;

            // Remove previous vote
            if (currentVote === 'up') upvotes--;
            if (currentVote === 'down') downvotes--;

            // Add new vote
            if (voteType === 'up') upvotes++;
            if (voteType === 'down') downvotes++;

            return { ...song, upvotes, downvotes };
          }),
        };
      });

      toast.success(voteType ? 'Vote recorded!' : 'Vote removed');
    } catch (error) {
      console.error('Vote failed:', error);
      toast.error('Failed to record vote. Please try again.');
    }
  };

  const handlePlay = (songId: string) => {
    // Find the song and open Spotify/YouTube if available
    const song = setlist?.songs.find((s) => s.id === songId);
    if (song?.spotifyUrl) {
      window.open(song.spotifyUrl, '_blank');
    } else if (song?.youtubeUrl) {
      window.open(song.youtubeUrl, '_blank');
    } else {
      toast.info('No streaming link available for this song');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${setlist?.name} - MySetlist`,
          text: `Check out this setlist for ${setlist?.show?.name}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share setlist');
    }
  };

  const handleExport = () => {
    if (!setlist?.songs?.length) {
      toast.error('No songs to export');
      return;
    }

    // Create Spotify playlist URL with song names
    const songNames = setlist.songs
      .map(
        (song) => `${song.song?.title || ''} ${song.song?.artist?.name || ''}`
      )
      .join('\n');
    const playlistData = {
      name: setlist.name,
      description: `Setlist from ${setlist.show?.name} on MySetlist`,
      songs: songNames,
    };

    // Copy to clipboard for now - could integrate with Spotify API later
    navigator.clipboard.writeText(JSON.stringify(playlistData, null, 2));
    toast.success('Setlist data copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/3 rounded bg-muted"></div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-muted"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="py-12 text-center">
        <div className="mb-2 font-semibold text-lg">No setlist available</div>
        <div className="text-muted-foreground">
          This show doesn't have a setlist yet.
        </div>
      </div>
    );
  }

  return (
    <UISetlistViewer
      setlist={setlist}
      userVotes={userVotes}
      onVote={handleVote}
      onPlay={handlePlay}
      onShare={handleShare}
      onExport={handleExport}
      showVoting={setlist.type === 'predicted'}
      showPlayControls={true}
    />
  );
}
