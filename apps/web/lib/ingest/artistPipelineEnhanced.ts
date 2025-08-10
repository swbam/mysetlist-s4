import { db } from "@repo/database";
import { artists } from "@repo/database";
import { eq } from "drizzle-orm";
import { upsertArtist } from "./upsertArtistEnhanced";

export async function ingestArtistPipelineEnhanced(tmId: string) {
  console.log(
    `🚀 Starting enhanced ingestion pipeline for Ticketmaster ID: ${tmId}`,
  );

  try {
    // Step 1: Upsert artist from Ticketmaster + Spotify data
    const artist = await upsertArtist(tmId);
    if (!artist) {
      throw new Error("Failed to upsert artist");
    }
    console.log(`✅ Upserted artist: ${artist.name} (${artist.id})`);

    // Step 2: Update last_synced timestamp
    await updateArtistLastSynced(artist.id);

    console.log(
      `🎉 Completed enhanced ingestion pipeline for artist: ${artist.name}`,
    );

    return {
      success: true,
      artistId: artist.id,
      artistName: artist.name,
      spotifyId: artist.spotifyId,
      popularity: artist.popularity,
      followers: artist.followers,
    };
  } catch (error) {
    console.error(
      `💥 Enhanced pipeline failed for Ticketmaster ID ${tmId}:`,
      error,
    );
    throw error;
  }
}

// Helper function to update last_synced timestamp
async function updateArtistLastSynced(artistId: string) {
  await db
    .update(artists)
    .set({
      lastSyncedAt: new Date(),
      lastFullSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(artists.id, artistId));
}
