import { db } from "@repo/database"
import { artists } from "@repo/database/src/schema"
import { desc } from "drizzle-orm"
import { ArtistCard } from "./artist-card"

export async function ArtistGridServer() {
  try {
    // Fetch top artists using the same query pattern as the search API
    const topArtists = await db
      .select()
      .from(artists)
      .orderBy(desc(artists.popularity))
      .limit(12)

    if (topArtists.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            No artists found. Use the search above to discover new artists!
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {topArtists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={{
              ...artist,
              verified: artist.verified ?? false,
            }}
          />
        ))}
      </div>
    )
  } catch (_error) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No artists found. Use the search above to discover new artists!
        </p>
        <p className="mt-2 text-muted-foreground text-xs">
          Try searching for artists like "Dave Matthews Band" to add them to
          your database.
        </p>
      </div>
    )
  }
}
