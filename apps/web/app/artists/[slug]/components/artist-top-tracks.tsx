'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { Play, Music } from 'lucide-react';
import { getArtistTopTracks } from '../actions';

interface Track {
  id: string;
  name: string;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

interface ArtistTopTracksProps {
  artistId: string;
  spotifyId: string | null;
}

export function ArtistTopTracks({ artistId, spotifyId }: ArtistTopTracksProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  useEffect(() => {
    if (spotifyId) {
      getArtistTopTracks(spotifyId)
        .then(setTracks)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [spotifyId]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  if (!spotifyId || (!loading && tracks.length === 0)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-12 w-12 items-center justify-center text-sm font-medium text-muted-foreground">
                  {index + 1}
                </div>
                <div className="relative h-12 w-12 overflow-hidden rounded">
                  {track.album.images[0]?.url ? (
                    <Image
                      src={track.album.images[0].url}
                      alt={track.album.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{track.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {track.album.name}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(track.duration_ms)}
                </span>
                {track.preview_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (playingTrack === track.id) {
                        setPlayingTrack(null);
                        // Stop audio
                      } else {
                        setPlayingTrack(track.id);
                        // Play audio
                      }
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}