import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
      "http://localhost:3001";

    // Call the calculate-trending endpoint directly
    const trendingResponse = await fetch(
      `${baseUrl}/api/cron/calculate-trending?mode=daily&type=all`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!trendingResponse.ok) {
      const errorText = await trendingResponse.text();
      throw new Error(`Trending calculation failed: ${errorText}`);
    }

    const trendingData = await trendingResponse.json();

    // Also trigger a master sync to update artist/show data
    const syncResponse = await fetch(
      `${baseUrl}/api/cron/master-sync?mode=daily`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
      },
    );

    let syncData = null;
    if (syncResponse.ok) {
      syncData = await syncResponse.json();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        trending: trendingData,
        sync: syncData,
      },
    });
  } catch (error) {
    console.error("Cron trending error:", error);
    return NextResponse.json(
      { 
        error: "Trending update failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 },
    );
  }
}
