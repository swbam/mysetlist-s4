import { type NextRequest, NextResponse } from "next/server";
import { db } from "@repo/database";
import { artists } from "@repo/database";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { ingestArtistPipelineEnhanced } from "~/lib/ingest/artistPipelineEnhanced";
import { desc, lte, or, isNull } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SyncResult {
  success: boolean;
  artistId: string;
  artistName: string;
  spotifyId?: string;
  popularity?: number;
  followers?: number;
}

// GET: Sync popular/trending artists
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 Starting popular artists sync...");
    
    // Get artists that need syncing (haven't been synced in 24 hours or never synced)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const artistsToSync = await db
      .select({
        id: artists.id,
        name: artists.name,
        ticketmasterId: artists.ticketmasterId,
        spotifyId: artists.spotifyId,
        trendingScore: artists.trendingScore,
        lastSyncedAt: artists.lastSyncedAt,
      })
      .from(artists)
      .where(
        or(
          isNull(artists.lastSyncedAt),
          lte(artists.lastSyncedAt, oneDayAgo)
        )
      )
      .orderBy(desc(artists.trendingScore))
      .limit(20); // Limit to 20 artists to avoid timeout

    console.log(`Found ${artistsToSync.length} artists to sync`);

    const results = {
      syncedArtists: [] as any[],
      errors: [] as string[],
      skipped: 0,
    };

    // Process artists in batches to avoid overwhelming the APIs
    for (const artist of artistsToSync) {
      try {
        if (artist.ticketmasterId) {
          // Use the enhanced pipeline for comprehensive sync
          const result = await ingestArtistPipelineEnhanced(artist.ticketmasterId);
          results.syncedArtists.push({
            id: artist.id,
            name: artist.name,
            ...result,
          });
          console.log(`✅ Synced ${artist.name}`);
        } else {
          results.skipped++;
          console.log(`⏭️  Skipped ${artist.name} (no Ticketmaster ID)`);
        }
        
        // Rate limiting: wait 1 second between artists
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const errorMsg = `Failed to sync ${artist.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`🎉 Sync complete: ${results.syncedArtists.length} synced, ${results.errors.length} errors, ${results.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.syncedArtists.length} artists`,
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Popular artists sync failed:", error);
    return NextResponse.json(
      {
        error: "Failed to sync popular artists",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST: Sync specific artist by Spotify or Ticketmaster ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spotifyId, ticketmasterId, artistName } = body;

    if (!spotifyId && !ticketmasterId && !artistName) {
      return NextResponse.json(
        { error: "Either spotifyId, ticketmasterId, or artistName is required" },
        { status: 400 }
      );
    }

    console.log(`🎯 Syncing specific artist: ${artistName || spotifyId || ticketmasterId}`);

    let result: SyncResult | null = null;

    if (ticketmasterId) {
      // Direct sync using Ticketmaster ID
      try {
        const pipelineResult = await ingestArtistPipelineEnhanced(ticketmasterId);
        result = {
          success: true,
          artistId: pipelineResult.artistId,
          artistName: pipelineResult.artistName,
          spotifyId: pipelineResult.spotifyId,
          popularity: pipelineResult.popularity,
          followers: pipelineResult.followers,
        };
      } catch (error) {
        throw new Error(`Failed to sync artist: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (spotifyId && artistName) {
      // Need to find or create Ticketmaster ID first
      const tmClient = new TicketmasterClient({});
      
      // Search for events by artist name to get Ticketmaster attraction ID
      const eventsResponse = await tmClient.searchEvents({
        keyword: artistName,
        classificationName: "Music",
        size: 1,
      });

      if (eventsResponse._embedded?.events?.[0]?._embedded?.attractions?.[0]) {
        const attraction = eventsResponse._embedded.events[0]._embedded.attractions[0];
        const pipelineResult = await ingestArtistPipelineEnhanced(attraction.id);
        result = {
          success: true,
          artistId: pipelineResult.artistId,
          artistName: pipelineResult.artistName,
          spotifyId: pipelineResult.spotifyId,
          popularity: pipelineResult.popularity,
          followers: pipelineResult.followers,
        };
      } else {
        throw new Error("Could not find Ticketmaster data for this artist");
      }
    }

    if (!result) {
      throw new Error("Failed to sync artist");
    }

    console.log(`✅ Successfully synced: ${result.artistName}`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.artistName}`,
      artist: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Specific artist sync failed:", error);
    return NextResponse.json(
      {
        error: "Failed to sync artist",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}