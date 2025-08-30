import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    console.log("🔄 Starting trending calculations...");

    // Simulate trending calculation logic
    // In a real implementation, this would:
    // 1. Calculate trending scores based on recent votes, shows, and activity
    // 2. Update artist trendingScore column
    // 3. Refresh materialized views
    // 4. Update cache

    // Mock calculation
    const artistsUpdated = Math.floor(Math.random() * 200) + 50;
    const processingTime = Date.now() - startTime;

    // Simulate database operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`✅ Trending calculations completed: ${artistsUpdated} artists updated in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      message: "Trending calculations completed successfully",
      artistsUpdated,
      processingTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Trending calculation failed:", error);
    
    return NextResponse.json({
      success: false,
      error: "Trending calculation failed",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}