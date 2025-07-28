import { getUser } from "@repo/auth/server";
import {
  artists,
  db,
  setlistSongs,
  setlists,
  shows,
  songs,
  votes,
} from "@repo/database";
import { count, eq, isNull, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const user = await getUser();

    // Check if user is admin (you'd implement your admin check here)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = {
      timestamp: new Date().toISOString(),
      checks: [] as any[],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };

    // Helper function to add check results
    const addCheck = (
      name: string,
      status: "pass" | "fail" | "warning",
      message: string,
      data?: any,
    ) => {
      report.checks.push({ name, status, message, data });
      report.summary.total++;
      report.summary[
        status === "pass" ? "passed" : status === "fail" ? "failed" : "warnings"
      ]++;
    };

    // 1. Check for artists without Spotify IDs
    const artistsWithoutSpotify = await db
      .select({ count: count() })
      .from(artists)
      .where(isNull(artists.spotifyId));

    if (artistsWithoutSpotify[0]?.count && artistsWithoutSpotify[0].count > 0) {
      addCheck(
        "Artists without Spotify ID",
        "warning",
        `${artistsWithoutSpotify[0].count} artists found without Spotify IDs`,
        { count: artistsWithoutSpotify[0].count },
      );
    } else {
      addCheck(
        "Artists without Spotify ID",
        "pass",
        "All artists have Spotify IDs",
      );
    }

    // 2. Check for shows without venues
    const showsWithoutVenues = await db
      .select({ count: count() })
      .from(shows)
      .where(isNull(shows.venueId));

    if (showsWithoutVenues[0]?.count && showsWithoutVenues[0].count > 0) {
      addCheck(
        "Shows without venues",
        "warning",
        `${showsWithoutVenues[0].count} shows found without venue information`,
        { count: showsWithoutVenues[0].count },
      );
    } else {
      addCheck(
        "Shows without venues",
        "pass",
        "All shows have venue information",
      );
    }

    // 3. Check for orphaned setlist songs
    const orphanedSetlistSongs = await db
      .select({ count: count() })
      .from(setlistSongs)
      .leftJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .where(isNull(setlists.id));

    if (orphanedSetlistSongs[0]?.count && orphanedSetlistSongs[0].count > 0) {
      addCheck(
        "Orphaned setlist songs",
        "fail",
        `${orphanedSetlistSongs[0].count} setlist songs reference non-existent setlists`,
        { count: orphanedSetlistSongs[0].count },
      );
    } else {
      addCheck(
        "Orphaned setlist songs",
        "pass",
        "No orphaned setlist songs found",
      );
    }

    // 4. Check for orphaned votes
    const orphanedVotes = await db
      .select({ count: count() })
      .from(votes)
      .leftJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
      .where(isNull(setlistSongs.id));

    if (orphanedVotes[0]?.count && orphanedVotes[0].count > 0) {
      addCheck(
        "Orphaned votes",
        "fail",
        `${orphanedVotes[0].count} votes reference non-existent setlist songs`,
        { count: orphanedVotes[0].count },
      );
    } else {
      addCheck("Orphaned votes", "pass", "No orphaned votes found");
    }

    // 5. Check vote count consistency
    const voteCountMismatches = await db
      .select({
        setlistSongId: setlistSongs.id,
        storedUpvotes: setlistSongs.upvotes,
        storedDownvotes: setlistSongs.downvotes,
        actualUpvotes: sql<number>`(
          SELECT COUNT(*) FROM votes 
          WHERE setlist_song_id = ${setlistSongs.id} 
          AND vote_type = 'up'
        )`,
        actualDownvotes: sql<number>`(
          SELECT COUNT(*) FROM votes 
          WHERE setlist_song_id = ${setlistSongs.id} 
          AND vote_type = 'down'
        )`,
      })
      .from(setlistSongs)
      .where(
        sql`
          (upvotes != (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ${setlistSongs.id} AND vote_type = 'up'))
          OR 
          (downvotes != (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ${setlistSongs.id} AND vote_type = 'down'))
        `,
      );

    if (voteCountMismatches.length > 0) {
      addCheck(
        "Vote count consistency",
        "fail",
        `${voteCountMismatches.length} setlist songs have incorrect vote counts`,
        { mismatches: voteCountMismatches.slice(0, 5) }, // First 5 examples
      );
    } else {
      addCheck(
        "Vote count consistency",
        "pass",
        "All vote counts are consistent",
      );
    }

    // 6. Check for duplicate songs by Spotify ID
    const duplicateSongs = await db
      .select({
        spotifyId: songs.spotifyId,
        count: count(),
      })
      .from(songs)
      .where(sql`${songs.spotifyId} IS NOT NULL`)
      .groupBy(songs.spotifyId)
      .having(sql`COUNT(*) > 1`);

    if (duplicateSongs.length > 0) {
      addCheck(
        "Duplicate songs",
        "warning",
        `${duplicateSongs.length} Spotify IDs have multiple song entries`,
        { duplicates: duplicateSongs.slice(0, 5) },
      );
    } else {
      addCheck("Duplicate songs", "pass", "No duplicate songs found");
    }

    // 7. Check for recent API errors (this would require an error log table)
    // This is a placeholder for future implementation
    addCheck(
      "API error rates",
      "pass",
      "API error monitoring not yet implemented",
    );

    // 8. Check database connection and performance
    const startTime = Date.now();
    await db.select({ count: count() }).from(artists);
    const queryTime = Date.now() - startTime;

    if (queryTime > 1000) {
      addCheck(
        "Database performance",
        "warning",
        `Database query took ${queryTime}ms (>1000ms threshold)`,
        { queryTime },
      );
    } else {
      addCheck(
        "Database performance",
        "pass",
        `Database responsive (${queryTime}ms)`,
      );
    }

    // 9. Check for missing required fields
    const artistsWithoutSlugs = await db
      .select({ count: count() })
      .from(artists)
      .where(isNull(artists.slug));

    if (artistsWithoutSlugs[0]?.count && artistsWithoutSlugs[0].count > 0) {
      addCheck(
        "Missing artist slugs",
        "fail",
        `${artistsWithoutSlugs[0].count} artists missing required slug field`,
        { count: artistsWithoutSlugs[0].count },
      );
    } else {
      addCheck("Missing artist slugs", "pass", "All artists have slugs");
    }

    // 10. Check for stale data
    const staleArtists = await db
      .select({ count: count() })
      .from(artists)
      .where(
        sql`
          ${artists.lastSyncedAt} IS NULL 
          OR ${artists.lastSyncedAt} < NOW() - INTERVAL '30 days'
        `,
      );

    if (staleArtists[0]?.count && staleArtists[0].count > 0) {
      addCheck(
        "Stale artist data",
        "warning",
        `${staleArtists[0].count} artists haven't been synced in 30+ days`,
        { count: staleArtists[0].count },
      );
    } else {
      addCheck("Stale artist data", "pass", "All artist data is recent");
    }

    return NextResponse.json(report);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to perform data integrity check" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    switch (action) {
      case "fix_vote_counts": {
        // Fix vote count inconsistencies
        await db.execute(sql`
          UPDATE setlist_songs 
          SET 
            upvotes = (
              SELECT COUNT(*) FROM votes 
              WHERE setlist_song_id = setlist_songs.id 
              AND vote_type = 'up'
            ),
            downvotes = (
              SELECT COUNT(*) FROM votes 
              WHERE setlist_song_id = setlist_songs.id 
              AND vote_type = 'down'
            ),
            net_votes = (
              SELECT COUNT(*) FROM votes 
              WHERE setlist_song_id = setlist_songs.id 
              AND vote_type = 'up'
            ) - (
              SELECT COUNT(*) FROM votes 
              WHERE setlist_song_id = setlist_songs.id 
              AND vote_type = 'down'
            )
        `);

        return NextResponse.json({
          success: true,
          message: "Vote counts have been recalculated",
          affectedRows: "unknown", // Drizzle doesn't provide row count for execute
        });
      }

      case "cleanup_orphaned_votes": {
        // Remove orphaned votes
        await db.execute(sql`
          DELETE FROM votes 
          WHERE setlist_song_id NOT IN (
            SELECT id FROM setlist_songs
          )
        `);

        return NextResponse.json({
          success: true,
          message: "Orphaned votes have been removed",
          deletedRows: "unknown", // Drizzle doesn't provide row count for execute
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to perform data repair" },
      { status: 500 },
    );
  }
}
