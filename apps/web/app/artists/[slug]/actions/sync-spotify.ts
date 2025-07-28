"use server"

import { db } from "@repo/database"
import { artists } from "@repo/database/src/schema"
import { spotify } from "@repo/external-apis"
import { eq } from "drizzle-orm"

export async function syncArtistWithSpotify(artistId: string) {
  // Get artist from database
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1)

  if (!artist || !artist.spotifyId) {
    throw new Error("Artist not found or no Spotify ID")
  }

  try {
    // Fetch latest data from Spotify
    const spotifyArtist = await spotify.getArtist(artist.spotifyId)

    // Update artist in database
    await db
      .update(artists)
      .set({
        name: spotifyArtist.name,
        imageUrl: spotifyArtist.images[0]?.url || null,
        smallImageUrl:
          spotifyArtist.images[1]?.url || spotifyArtist.images[0]?.url || null,
        genres: JSON.stringify(spotifyArtist.genres),
        popularity: spotifyArtist.popularity,
        followers: spotifyArtist.followers.total,
        externalUrls: JSON.stringify(spotifyArtist.external_urls),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId))

    return { success: true }
  } catch (_error) {
    return { success: false, error: "Failed to sync with Spotify" }
  }
}
