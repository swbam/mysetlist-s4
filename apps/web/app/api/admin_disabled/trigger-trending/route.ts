import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "daily";
    const type = searchParams.get("type") || "all";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          error: "CRON_SECRET not configured",
          message: "Cannot trigger trending calculations without CRON_SECRET",
        },
        { status: 500 },
      );
    }

    // Trigger trending calculation
    const trendingResponse = await fetch(
      `${baseUrl}/api/cron/calculate-trending?mode=${mode}&type=${type}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
      },
    );

    let trendingResult = null;
    if (trendingResponse.ok) {
      trendingResult = await trendingResponse.json();
    } else {
      const errorText = await trendingResponse.text();
      console.error("Trending calculation failed:", errorText);
    }

    // Trigger master sync if requested
    let syncResult = null;
    if (searchParams.get("sync") === "true") {
      const syncResponse = await fetch(
        `${baseUrl}/api/cron/master-sync?mode=${mode}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (syncResponse.ok) {
        syncResult = await syncResponse.json();
      } else {
        const errorText = await syncResponse.text();
        console.error("Sync failed:", errorText);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Trending calculations triggered successfully",
      mode,
      type,
      timestamp: new Date().toISOString(),
      results: {
        trending: trendingResult,
        sync: syncResult,
      },
    });
  } catch (error) {
    console.error("Failed to trigger trending calculations:", error);

    return NextResponse.json(
      {
        error: "Failed to trigger trending calculations",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
