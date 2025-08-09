import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy" as "healthy" | "degraded" | "unhealthy",
    checks: {
      database: { status: "unknown", message: "" },
      supabase: { status: "unknown", message: "" },
      apis: { status: "unknown", message: "" },
      data: { status: "unknown", message: "" },
    },
  };

  try {
    // Check database connection
    const dbResult = await db.execute(sql`SELECT 1`);
    checks.checks.database = {
      status: "healthy",
      message: "Database connection successful",
    };
  } catch (error) {
    checks.checks.database = {
      status: "unhealthy",
      message: `Database error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
    checks.status = "unhealthy";
  }

  try {
    // Check Supabase connection
    const { createServiceClient } = await import("~/lib/supabase/server");
    const supabase = await createServiceClient();
    const { error } = await supabase.from("artists").select("id").limit(1);
    
    if (error) throw error;
    
    checks.checks.supabase = {
      status: "healthy",
      message: "Supabase connection successful",
    };
  } catch (error) {
    checks.checks.supabase = {
      status: "unhealthy",
      message: `Supabase error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
    checks.status = "degraded";
  }

  try {
    // Check external APIs availability
    const apiChecks = {
      spotify: !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET,
      ticketmaster: !!process.env.TICKETMASTER_API_KEY,
      setlistfm: !!process.env.SETLISTFM_API_KEY,
    };

    const missingApis = Object.entries(apiChecks)
      .filter(([_, available]) => !available)
      .map(([api]) => api);

    if (missingApis.length === 0) {
      checks.checks.apis = {
        status: "healthy",
        message: "All API credentials configured",
      };
    } else {
      checks.checks.apis = {
        status: "degraded",
        message: `Missing API credentials: ${missingApis.join(", ")}`,
      };
      if (checks.status === "healthy") checks.status = "degraded";
    }
  } catch (error) {
    checks.checks.apis = {
      status: "unhealthy",
      message: `API check error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }

  try {
    // Check data completeness
    const dataCounts = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM artists) as artists,
        (SELECT COUNT(*) FROM shows) as shows,
        (SELECT COUNT(*) FROM venues) as venues,
        (SELECT COUNT(*) FROM songs) as songs,
        (SELECT COUNT(*) FROM artist_songs) as artist_songs
    `);

    const counts = dataCounts[0];
    const hasData = counts && 
      Number(counts.artists) > 0 && 
      Number(counts.songs) > 0;

    if (hasData) {
      checks.checks.data = {
        status: "healthy",
        message: `Data loaded: ${counts.artists} artists, ${counts.songs} songs, ${counts.shows} shows`,
      };
    } else {
      checks.checks.data = {
        status: "degraded",
        message: "No data loaded - run sync to populate",
      };
      if (checks.status === "healthy") checks.status = "degraded";
    }
  } catch (error) {
    checks.checks.data = {
      status: "unhealthy",
      message: `Data check error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }

  return NextResponse.json(checks, {
    status: checks.status === "unhealthy" ? 503 : 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
