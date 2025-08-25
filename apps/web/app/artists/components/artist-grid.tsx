"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Music } from "lucide-react";
import { useEffect, useState } from "react";
import { ArtistCard } from "~/components/cards/artist-card";
import {
  EmptyState,
  ResponsiveGrid,
} from "~/components/layout/responsive-grid";

interface Artist {
  id: string;
  name: string;
  slug: string;
  genres: string[] | string | null;
  imageUrl: string | null;
  smallImageUrl?: string | null;
  followers: number | null;
  followerCount?: number | null;
  upcomingShows: number;
  trendingScore: number;
  verified?: boolean;
  popularity?: number | null;
}

export const ArtistGrid = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await fetch("/api/artists?limit=20");
      if (!response.ok) {
        throw new Error("Failed to fetch artists");
      }

      const data = await response.json();

      // Map the API response to our component's interface
      const mappedArtists: Artist[] = data.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        genres: artist.genres,
        imageUrl: artist.imageUrl || artist.image_url,
        smallImageUrl: artist.smallImageUrl || artist.small_image_url,
        followers: artist.followers,
        followerCount: artist.followerCount || artist.follower_count,
        upcomingShows: artist.upcomingShows || artist.upcoming_shows || 0,
        trendingScore: artist.trendingScore || artist.trending_score || 0,
        verified: artist.verified || false,
        popularity: artist.popularity,
      }));

      setArtists(mappedArtists);
    } catch (err) {
      console.error("Error fetching artists:", err);
      setError("Failed to load artists. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = (_artistId: string) => {
    // TODO: Implement follow functionality
    // Follow artist action
  };

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchArtists} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      icon={<Music className="h-8 w-8 text-muted-foreground" />}
      title="No Artists Found"
      description="No artists found. Try searching for new artists to discover!"
    />
  );

  return (
    <ResponsiveGrid
      variant="artists"
      loading={loading}
      loadingCount={12}
      emptyState={emptyState}
    >
      {artists.map((artist) => (
        <div key={artist.id} role="gridcell">
          <ArtistCard
            artist={{
              id: artist.id,
              name: artist.name,
              slug: artist.slug,
              imageUrl: artist.imageUrl,
              smallImageUrl: artist.smallImageUrl,
              genres: artist.genres,
              verified: artist.verified,
              followers: artist.followers,
              followerCount: artist.followerCount,
              trendingScore: artist.trendingScore,
              popularity: artist.popularity,
              upcomingShows: artist.upcomingShows,
            }}
            variant="default"
            showFollowButton={true}
            onFollow={handleFollow}
          />
        </div>
      ))}
    </ResponsiveGrid>
  );
};
