import { createServiceClient } from "~/lib/supabase/server";
import { ArtistCard } from "~/components/cards/artist-card";
import {
  ResponsiveGrid,
  EmptyState,
} from "~/components/layout/responsive-grid";
import { Music } from "lucide-react";

async function getPopularArtists() {
  const supabase = createServiceClient();

  // Get artists ordered by their overall popularity
  const { data: popularArtists, error } = await supabase
    .from("artists")
    .select(
      `
      id,
      name,
      slug,
      image_url,
      small_image_url,
      genres,
      verified,
      follower_count,
      trending_score,
      popularity
    `,
    )
    .eq("verified", true)
    .order("follower_count", { ascending: false })
    .limit(12);

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
      imageUrl: artist.image_url,
      smallImageUrl: artist.small_image_url,
      genres: artist.genres,
      verified: artist.verified,
      followerCount: artist.follower_count || 0,
      trendingScore: artist.trending_score,
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
