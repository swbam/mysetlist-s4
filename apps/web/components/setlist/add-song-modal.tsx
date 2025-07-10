'use client';

import { Button } from '@repo/design-system/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import { Music } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { SongSelector } from './song-selector';

interface Song {
  id: string;
  spotify_id: string;
  title: string;
  artist: string;
  album?: string;
  album_art_url?: string;
  duration_ms?: number;
  is_explicit?: boolean;
}

interface AddSongModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setlistId: string;
  artistId?: string;
  onSongAdded?: (song: Song) => void;
}

export function AddSongModal({
  open,
  onOpenChange,
  setlistId,
  artistId,
  onSongAdded,
}: AddSongModalProps) {
  const [isPending, startTransition] = useTransition();

  const handleSongSelect = async (song: Song) => {
    startTransition(async () => {
      try {
        // First, check if song exists in our database, if not create it
        const songResponse = await fetch('/api/songs/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spotify_id: song.spotify_id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            album_art_url: song.album_art_url,
            duration_ms: song.duration_ms,
            is_explicit: song.is_explicit,
          }),
        });

        if (!songResponse.ok) {
          throw new Error('Failed to save song');
        }

        const { song: savedSong } = await songResponse.json();

        // Then add to setlist
        const setlistResponse = await fetch('/api/setlists/songs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            setlistId,
            songId: savedSong.id,
            position: 999, // Will be adjusted by server
          }),
        });

        if (!setlistResponse.ok) {
          const error = await setlistResponse.text();
          throw new Error(error || 'Failed to add song to setlist');
        }

        toast.success(`"${song.title}" added to setlist`);
        onSongAdded?.(song);

        // Keep modal open for adding more songs
        // onOpenChange(false);
      } catch (error: any) {
        toast.error(error.message || 'Failed to add song');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Add Songs to Setlist
          </DialogTitle>
          <DialogDescription>
            Search for songs to add to the setlist. Songs will be added to the
            end of the current setlist.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <SongSelector
            onSongSelect={handleSongSelect}
            artistId={artistId}
            placeholder="Search for songs to add..."
            maxHeight="400px"
            disabled={isPending}
          />
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <div className="text-muted-foreground text-xs">
            Tip: Songs are automatically saved as you add them
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
