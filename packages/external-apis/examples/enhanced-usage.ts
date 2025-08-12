/**
 * Enhanced MySetlist Sync Services Usage Examples
 *
 * This file demonstrates the enhanced sync services with new features:
 * - ArtistSyncService: syncIdentifiers and syncCatalog methods
 * - ShowSyncService: enhanced syncArtistShows method (already implemented)
 * - SetlistSyncService: ensureInitialSetlists method
 */

import {
  ArtistSyncService,
  SetlistSyncService,
  ShowSyncService,
} from "@repo/external-apis";

async function enhancedSyncWorkflow() {
  const artistSyncService = new ArtistSyncService();
  const showSyncService = new ShowSyncService();
  const setlistSyncService = new SetlistSyncService();

  try {
    // 1. Enhanced Artist Sync with Identifier Mapping
    console.log("🎵 Starting enhanced artist sync...");

    // Map Ticketmaster attraction to Spotify artist and MBID
    const identifiers = await artistSyncService.syncIdentifiers("K8vZ9171M7G"); // Example TM ID
    if (identifiers) {
      console.log("✅ Mapped identifiers:", identifiers);

      if (identifiers.spotifyId) {
        // Sync full catalog excluding live tracks with deduplication
        const catalogResult = await artistSyncService.syncCatalog(
          identifiers.spotifyId,
        );
        console.log("✅ Catalog sync completed:", {
          totalSongs: catalogResult.totalSongs,
          totalAlbums: catalogResult.totalAlbums,
          skippedLiveTracks: catalogResult.skippedLiveTracks,
          deduplicatedTracks: catalogResult.deduplicatedTracks,
        });
      }
    }

    // 2. Enhanced Show Sync (already robust)
    console.log("🎪 Starting show sync...");

    // Sync shows for a specific artist by database ID
    const showResults =
      await showSyncService.syncArtistShows("artist-uuid-here");
    console.log("✅ Show sync completed:", {
      upcomingShows: showResults.upcomingShows,
      created: showResults.created,
      updated: showResults.updated,
    });

    // 3. Enhanced Setlist Creation
    console.log("🎼 Creating initial setlists...");

    // Ensure initial setlists exist for new shows
    const setlistResult = await setlistSyncService.ensureInitialSetlists(
      "show-uuid-here",
      {
        songCount: 5,
        weightByPopularity: true,
        excludeLive: true,
      },
    );

    console.log("✅ Initial setlist creation:", {
      created: setlistResult.created,
      songCount: setlistResult.songCount,
      skippedLive: setlistResult.skippedLive,
    });

    // 4. Complete Artist Pipeline Example
    console.log("🔄 Running complete sync pipeline...");

    const artistSpotifyId = "4Z8W4fKeB5YxbusRsdQVPb"; // Example: Radiohead

    // Step 1: Sync artist basic info
    await artistSyncService.syncArtist(artistSpotifyId);

    // Step 2: Sync full catalog
    const catalog = await artistSyncService.syncCatalog(artistSpotifyId);
    console.log(
      `📀 Catalog: ${catalog.totalSongs} songs, ${catalog.totalAlbums} albums`,
    );

    // Step 3: Sync shows for the artist (assuming we have the DB ID)
    // const shows = await showSyncService.syncArtistShows(artistDbId);

    // Step 4: Create setlists for upcoming shows
    // await setlistSyncService.createDefaultSetlists(artistDbId);

    console.log("🎉 Complete sync pipeline finished!");
  } catch (error) {
    console.error("❌ Sync failed:", error);
    throw error;
  }
}

/**
 * Error Handling and Rate Limiting Examples
 */
async function errorHandlingExample() {
  const artistSyncService = new ArtistSyncService();

  try {
    // The services include built-in error handling and rate limiting
    console.log("🔄 Testing error handling...");

    // This will automatically retry on failure with exponential backoff
    const result = await artistSyncService.syncCatalog("invalid-spotify-id");
    console.log("Result:", result);
  } catch (error) {
    // Detailed error information is provided
    console.error("Error details:", {
      message: error.message,
      service: error.service,
      operation: error.operation,
      context: error.context,
    });
  }
}

/**
 * Batch Processing Example
 */
async function batchProcessingExample() {
  const artistSyncService = new ArtistSyncService();
  const setlistSyncService = new SetlistSyncService();

  console.log("📦 Starting batch processing...");

  // List of artist IDs to process
  const artistIds = [
    "4Z8W4fKeB5YxbusRsdQVPb", // Radiohead
    "3WrFJ7ztbogyGnTHbHJFl2", // The Beatles
    "0OdUWJ0sBjDrqHygGUXeCF", // Band of Horses
  ];

  const results = [];

  for (const artistId of artistIds) {
    try {
      console.log(`🎵 Processing artist: ${artistId}`);

      // Sync artist and catalog
      await artistSyncService.syncArtist(artistId);
      const catalogResult = await artistSyncService.syncCatalog(artistId);

      results.push({
        artistId,
        success: true,
        totalSongs: catalogResult.totalSongs,
        skippedLive: catalogResult.skippedLiveTracks,
      });

      // Rate limiting is handled automatically by the services
      console.log(
        `✅ Completed ${artistId}: ${catalogResult.totalSongs} songs`,
      );
    } catch (error) {
      console.error(`❌ Failed ${artistId}:`, error.message);
      results.push({
        artistId,
        success: false,
        error: error.message,
      });
    }
  }

  console.log("📊 Batch processing results:", results);
  return results;
}

export { enhancedSyncWorkflow, errorHandlingExample, batchProcessingExample };
