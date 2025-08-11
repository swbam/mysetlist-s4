import { db } from "@repo/database";
import { artists } from "@repo/database/src/schema";
import { desc } from "drizzle-orm";
import { Music } from "lucide-react";
import { ArtistCard } from "~/components/cards/artist-card";
import {
  EmptyState,
  ResponsiveGrid,
} from "~/components/layout/responsive-grid";

export async function ArtistGridServer() {
  try {
    // Fetch top artists using the same query pattern as the search API
    const topArtists = await db
      .select()
      .from(artists)
      .orderBy(desc(artists.popularity))
      .limit(12);

    const emptyState = (
      <EmptyState
        icon={<Music className="h-8 w-8 text-muted-foreground" />}
        title="No Artists Found"
        description="Use the search above to discover new artists and add them to your database!"
      />
    );

    return (
      <ResponsiveGrid variant="artists" emptyState={emptyState}>
        {topArtists.map((artist) => (
          <div key={artist.id} role="gridcell">
            <ArtistCard
              artist={{
                id: artist.id,
                name: artist.name,
                slug: artist.slug,
                imageUrl: artist.imageUrl,
                smallImageUrl: artist.smallImageUrl,
                genres: artist.genres,
                verified: artist.verified ?? false,
                followerCount: artist.followerCount,
                trendingScore: artist.trendingScore,
                popularity: artist.popularity,
              }}
              variant="default"
            />
          </div>
        ))}
      </ResponsiveGrid>
    );
  } catch (_error) {
    const errorState = (
      <EmptyState
        icon={<Music className="h-8 w-8 text-muted-foreground" />}
        title="No Artists Found"
        description='Use the search above to discover new artists! Try searching for artists like "Dave Matthews Band" to add them to your database.'
      />
    );

    return <ResponsiveGrid variant="artists" emptyState={errorState}><></></ResponsiveGrid>;
  }
}
