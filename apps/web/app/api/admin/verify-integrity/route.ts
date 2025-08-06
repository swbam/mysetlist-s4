import { getUser } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

interface IntegrityCheck {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: any;
}

interface IntegrityReport {
  timestamp: string;
  checks: IntegrityCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getUser();

    // Check if user is authenticated (add admin check as needed)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const report: IntegrityReport = {
      timestamp: new Date().toISOString(),
      checks: [],
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
      details?: any,
    ) => {
      report.checks.push({ name, status, message, details });
      report.summary.total++;
      report.summary[
        status === "pass" ? "passed" : status === "fail" ? "failed" : "warnings"
      ]++;
    };

    // 1. Check vote count consistency
    const { data: voteInconsistencies, error: voteError } = await supabase.rpc(
      "check_vote_consistency",
    );

    if (voteError) {
      addCheck(
        "Vote Count Consistency",
        "fail",
        "Failed to check vote consistency",
        { error: voteError.message },
      );
    } else if (voteInconsistencies && voteInconsistencies.length > 0) {
      addCheck(
        "Vote Count Consistency",
        "fail",
        `${voteInconsistencies.length} setlist songs have incorrect vote counts`,
        { inconsistencies: voteInconsistencies.slice(0, 5) },
      );
    } else {
      addCheck(
        "Vote Count Consistency",
        "pass",
        "All vote counts are consistent",
      );
    }

    // 2. Check for orphaned records
    const { data: orphanedVotes } = await supabase.rpc("count_orphaned_votes");

    if (orphanedVotes && orphanedVotes > 0) {
      addCheck(
        "Orphaned Votes",
        "fail",
        `${orphanedVotes} votes reference non-existent setlist songs`,
        { count: orphanedVotes },
      );
    } else {
      addCheck("Orphaned Votes", "pass", "No orphaned votes found");
    }

    // 3. Check for duplicate songs
    const { data: duplicateSongs } = await supabase
      .from("songs")
      .select("spotify_id")
      .not("spotify_id", "is", null)
      .order("spotify_id");

    const spotifyIdCounts = new Map<string, number>();
    duplicateSongs?.forEach((song) => {
      const count = spotifyIdCounts.get(song.spotify_id) || 0;
      spotifyIdCounts.set(song.spotify_id, count + 1);
    });

    const duplicates = Array.from(spotifyIdCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([spotifyId, count]) => ({ spotifyId, count }));

    if (duplicates.length > 0) {
      addCheck(
        "Duplicate Songs",
        "warning",
        `${duplicates.length} Spotify IDs have multiple song entries`,
        { duplicates: duplicates.slice(0, 5) },
      );
    } else {
      addCheck("Duplicate Songs", "pass", "No duplicate songs found");
    }

    // 4. Check for missing slugs
    const { data: artistsWithoutSlugs } = await supabase
      .from("artists")
      .select("id, name")
      .or("slug.is.null,slug.eq.");

    if (artistsWithoutSlugs && artistsWithoutSlugs.length > 0) {
      addCheck(
        "Missing Artist Slugs",
        "fail",
        `${artistsWithoutSlugs.length} artists missing required slug field`,
        { examples: artistsWithoutSlugs.slice(0, 3) },
      );
    } else {
      addCheck("Missing Artist Slugs", "pass", "All artists have slugs");
    }

    // 5. Check foreign key relationships
    const { data: showsWithoutArtists } = await supabase
      .from("shows")
      .select("id, name")
      .is("headliner_artist_id", null);

    if (showsWithoutArtists && showsWithoutArtists.length > 0) {
      addCheck(
        "Shows Without Artists",
        "fail",
        `${showsWithoutArtists.length} shows have no headliner artist`,
        { examples: showsWithoutArtists.slice(0, 3) },
      );
    } else {
      addCheck(
        "Shows Without Artists",
        "pass",
        "All shows have headliner artists",
      );
    }

    // 6. Check trending scores
    const { data: unrankedArtists } = await supabase
      .from("artists")
      .select("id")
      .or("trending_score.is.null,trending_score.eq.0")
      .limit(1);

    if (unrankedArtists && unrankedArtists.length > 0) {
      addCheck(
        "Trending Scores",
        "warning",
        "Some artists have no trending scores calculated",
        { needsCalculation: true },
      );
    } else {
      addCheck("Trending Scores", "pass", "All artists have trending scores");
    }

    // 7. Check user follows integrity
    const { data: followsTable } = await supabase.rpc("table_exists", {
      table_name: "user_follows_artists",
    });

    if (followsTable) {
      addCheck("User Follows Table", "pass", "User follows table exists");
    } else {
      addCheck(
        "User Follows Table",
        "fail",
        "user_follows_artists table does not exist",
        { migration_needed: true },
      );
    }

    // 8. Check database performance
    const startTime = Date.now();
    await supabase.from("artists").select("id").limit(1);
    const queryTime = Date.now() - startTime;

    if (queryTime > 1000) {
      addCheck(
        "Database Performance",
        "warning",
        `Database query took ${queryTime}ms (>1000ms threshold)`,
        { queryTime },
      );
    } else {
      addCheck(
        "Database Performance",
        "pass",
        `Database responsive (${queryTime}ms)`,
      );
    }

    // 9. Check for stale data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleArtists } = await supabase
      .from("artists")
      .select("id")
      .or(
        `last_synced_at.is.null,last_synced_at.lt.${thirtyDaysAgo.toISOString()}`,
      )
      .limit(1);

    if (staleArtists && staleArtists.length > 0) {
      addCheck(
        "Stale Artist Data",
        "warning",
        "Some artists haven't been synced in 30+ days",
        { needsSync: true },
      );
    } else {
      addCheck("Stale Artist Data", "pass", "All artist data is recent");
    }

    // 10. Check data relationships
    const { data: setlistsWithoutSongs } = await supabase.rpc(
      "count_empty_setlists",
    );

    if (setlistsWithoutSongs && setlistsWithoutSongs > 0) {
      addCheck(
        "Empty Setlists",
        "warning",
        `${setlistsWithoutSongs} setlists have no songs`,
        { count: setlistsWithoutSongs },
      );
    } else {
      addCheck("Empty Setlists", "pass", "All setlists have songs");
    }

    return NextResponse.json(report);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to verify data integrity" },
      { status: 500 },
    );
  }
}

// POST endpoint to fix specific issues
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();
    const supabase = createServiceClient();

    switch (action) {
      case "recalculate_trending": {
        // Trigger trending score recalculation
        const { error: trendingError } = await supabase.rpc(
          "recalculate_all_trending_scores",
        );

        if (trendingError) {
          throw trendingError;
        }

        return NextResponse.json({
          success: true,
          message: "Trending scores recalculated successfully",
        });
      }

      case "fix_slugs": {
        // Fix missing slugs
        const { error: slugError } = await supabase.rpc("fix_missing_slugs");

        if (slugError) {
          throw slugError;
        }

        return NextResponse.json({
          success: true,
          message: "Missing slugs have been generated",
        });
      }

      case "cleanup_orphans": {
        // Clean up orphaned records
        const { error: cleanupError } = await supabase.rpc(
          "cleanup_orphaned_records",
        );

        if (cleanupError) {
          throw cleanupError;
        }

        return NextResponse.json({
          success: true,
          message: "Orphaned records have been cleaned up",
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fix data issues" },
      { status: 500 },
    );
  }
}
