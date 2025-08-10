import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

// Verify cron authentication
async function verifyCronAuth(): Promise<boolean> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    if (!(await verifyCronAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "hourly";
    const limit = Number.parseInt(searchParams.get("limit") || "10");

    console.log(`[Master Sync] Starting ${mode} sync with limit ${limit}`);

    const results = {
      mode,
      startTime: new Date().toISOString(),
      artists: { synced: 0, errors: 0 },
      shows: { synced: 0, errors: 0 },
      songs: { synced: 0, errors: 0 },
      trending: { calculated: false },
      errors: [] as any[],
    };

    try {
      // Step 1: Sync popular artists without songs
      const artistsWithoutSongs = await db.execute(sql`
        SELECT 
          a.id,
          a.spotify_id,
          a.name,
          a.popularity,
          COUNT(DISTINCT ars.song_id) as song_count
        FROM artists a
        LEFT JOIN artist_songs ars ON a.id = ars.artist_id
        WHERE a.spotify_id IS NOT NULL
          AND a.verified = true
        GROUP BY a.id
        HAVING COUNT(DISTINCT ars.song_id) < 5
        ORDER BY a.popularity DESC NULLS LAST
        LIMIT ${limit}
      `);

      console.log(
        `[Master Sync] Found ${artistsWithoutSongs.length} artists needing song sync`,
      );

      // Sync each artist's songs
      for (const artist of artistsWithoutSongs) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/sync/artist-songs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
              },
              body: JSON.stringify({
                artistId: artist.id,
                spotifyId: artist.spotify_id,
                forceSync: true,
              }),
            },
          );

          if (response.ok) {
            results.artists.synced++;
            const data = await response.json();
            console.log(
              `[Master Sync] Synced songs for ${artist.name}: ${data.songs?.synced || 0} songs`,
            );
            results.songs.synced += data.songs?.synced || 0;
          } else {
            results.artists.errors++;
            results.errors.push({
              artist: artist.name,
              error: `HTTP ${response.status}`,
            });
          }
        } catch (error) {
          results.artists.errors++;
          results.errors.push({
            artist: artist.name,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Step 2: Sync upcoming shows for active artists
      if (mode === "hourly" || mode === "daily") {
        const activeArtists = await db.execute(sql`
          SELECT 
            a.id,
            a.name,
            a.ticketmaster_id
          FROM artists a
          WHERE a.ticketmaster_id IS NOT NULL
            AND a.verified = true
            AND (
              a.last_synced_at IS NULL 
              OR a.last_synced_at < NOW() - INTERVAL '24 hours'
            )
          ORDER BY a.popularity DESC NULLS LAST
          LIMIT ${limit}
        `);

        console.log(
          `[Master Sync] Found ${activeArtists.length} artists needing show sync`,
        );

        for (const artist of activeArtists) {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/sync/shows`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.CRON_SECRET}`,
                },
                body: JSON.stringify({
                  artistId: artist.id,
                  artistName: artist.name,
                }),
              },
            );

            if (response.ok) {
              results.shows.synced++;
              const data = await response.json();
              console.log(
                `[Master Sync] Synced shows for ${artist.name}: ${data.shows?.length || 0} shows`,
              );
            } else {
              results.shows.errors++;
            }
          } catch (error) {
            results.shows.errors++;
            results.errors.push({
              artist: artist.name,
              type: "shows",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }

      // Step 3: Calculate trending scores
      if (mode === "daily" || mode === "trending") {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/cron/calculate-trending`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
              },
            },
          );

          if (response.ok) {
            results.trending.calculated = true;
            console.log(
              "[Master Sync] Trending scores calculated successfully",
            );
          }
        } catch (error) {
          results.errors.push({
            type: "trending",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Step 4: Log sync job completion
      await db.execute(sql`
        INSERT INTO sync_jobs (
          job_type,
          status,
          details,
          created_at,
          completed_at
        ) VALUES (
          ${`master_sync_${mode}`},
          'completed',
          ${JSON.stringify(results)},
          NOW(),
          NOW()
        )
      `);
    } catch (error) {
      console.error("[Master Sync] Error:", error);
      results.errors.push({
        type: "general",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    results.endTime = new Date().toISOString();
    console.log("[Master Sync] Completed:", results);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("[Master Sync] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Master sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // Handle manual sync triggers
  return GET(request);
}
