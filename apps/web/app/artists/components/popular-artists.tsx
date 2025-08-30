import { Music } from "lucide-react";
import { ArtistCard } from "~/components/cards/artist-card";
import {
  EmptyState,
  ResponsiveGrid,
} from "~/components/layout/responsive-grid";
import { createConvexClient } from "~/lib/database";
import { api } from "~/lib/convex-api";

async function getPopularArtists() {
  const convex = createConvexClient();

  // Get popular artists from Convex
  const popularArtists = await convex.query(api.artists.getAll, { limit: 12 });

  if (error) {
    console.error("Error fetching popular artists:", error);
    return [];
  }

  // Process the data to match the expected format
  const processedArtists =
    popularArtists?.map((artist) => ({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      imageUrl: artist.imageUrl,
      smallImageUrl: artist.small_imageUrl,
      genres: artist.genres,
      verified: artist.verified,
      followerCount: artist.followerCount || 0,
      trendingScore: artist.trendingScore,
      popularity: artist.popularity,
      upcomingShows: 0, // TODO: Get from shows table
    })) || [];

  return processedArtists;
}

export async function PopularArtists() {
  const artists = await getPopularArtists();

  const emptyState = (
    <EmptyState
      icon={<Music className="h-8 w-8 text-muted-foreground" />}
      title="No Popular Artists"
      description="Check back soon for trending and popular artists in your area."
    />
  );

  return (
    <ResponsiveGrid
      variant="artists"
      emptyState={emptyState}
      className="min-h-[400px]"
    >
      {artists.map((artist) => (
        <div key={artist.id} role="gridcell">
          <ArtistCard
            artist={artist}
            variant="default"
            showFollowButton={false}
          />
        </div>
      ))}
    </ResponsiveGrid>
  );
}
