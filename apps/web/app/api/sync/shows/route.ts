import { ShowSyncService } from "@repo/external-apis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface ShowSyncRequest {
  city?: string;
  stateCode?: string;
  keyword?: string;
  classificationName?: string;
  startDateTime?: string;
  endDateTime?: string;
  size?: number;
  artistId?: string; // For syncing specific artist shows
}

export async function POST(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ShowSyncRequest = await request.json();
    const showSyncService = new ShowSyncService();

    let result: any;

    if (body.artistId) {
      // Sync shows for a specific artist
      result = await showSyncService.syncArtistShows(body.artistId);
    } else {
      // Sync general upcoming shows
      const syncOptions = {
        city: body.city,
        stateCode: body.stateCode,
        keyword: body.keyword,
        classificationName: body.classificationName || "music",
        startDateTime: body.startDateTime || new Date().toISOString(),
        endDateTime: body.endDateTime,
      };

      await showSyncService.syncUpcomingShows(syncOptions);

      result = {
        message: "General show sync completed",
        options: syncOptions,
      };
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Show sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Show sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showSyncService = new ShowSyncService();

    const syncOptions = {
      city: searchParams.get("city") || undefined,
      stateCode: searchParams.get("stateCode") || undefined,
      keyword: searchParams.get("keyword") || undefined,
      classificationName: searchParams.get("classificationName") || "music",
      startDateTime:
        searchParams.get("startDateTime") || new Date().toISOString(),
      endDateTime: searchParams.get("endDateTime") || undefined,
    };

    const artistId = searchParams.get("artistId");

    let result: any;

    if (artistId) {
      // Sync shows for a specific artist
      result = await showSyncService.syncArtistShows(artistId);
    } else {
      // Sync general upcoming shows
      await showSyncService.syncUpcomingShows(syncOptions);

      result = {
        message: "General show sync completed",
        options: syncOptions,
      };
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Show sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Show sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
