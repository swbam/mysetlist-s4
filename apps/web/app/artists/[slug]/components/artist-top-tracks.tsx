"use client";

import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { Skeleton } from "@repo/design-system";
import { Music, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getArtistTopTracks } from "../actions";

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
    const fetchTracks = async () => {
      try {
        setLoading(true);

        if (spotifyId) {
          // Try to fetch from Spotify via server action first
          const spotifyTracks = await getArtistTopTracks(spotifyId);
          if (
            spotifyTracks &&
            (Array.isArray(spotifyTracks)
              ? spotifyTracks.length > 0
              : spotifyTracks.tracks?.length > 0)
          ) {
            const tracks = Array.isArray(spotifyTracks)
              ? spotifyTracks
              : spotifyTracks.tracks;
            setTracks(tracks as unknown as Track[]);
            return;
          }
        }

        // Fallback to API route (may return empty if no Spotify data)
        const response = await fetch(`/api/artists/${artistId}/top-tracks`);
        if (response.ok) {
          const data = await response.json();
          const apiTracks = data.tracks.map((track: any) => ({
            ...track,
            album: {
              name: track.album || "Unknown Album",
              images: track.album_images || [],
            },
          }));
          setTracks(apiTracks);
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [artistId, spotifyId]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, "0")}`;
  };

  if (!loading && tracks.length === 0) {
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
            {[...new Array(5)].map((_, i) => (
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
                <div className="flex h-12 w-12 items-center justify-center font-medium text-muted-foreground text-sm">
                  {index + 1}
                </div>
                <div className="relative h-12 w-12 overflow-hidden rounded">
                  {track.album.images[0]?.url ? (
                    <Image
                      src={track.album.images[0].url}
                      alt={track.album.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{track.name}</p>
                  <p className="truncate text-muted-foreground text-sm">
                    {track.album.name}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm">
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
