import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check for authorization (simple cron secret check)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, data, artistId, ticketmasterId, spotifyId, options } = body;

    // Sync operations that delegate to specialized endpoints
    switch (type) {
      case "artist":
      case "artists": {
        // Delegate to orchestration endpoint for comprehensive artist sync
        const orchestrationResponse = await fetch(
          `${request.nextUrl.origin}/api/sync/orchestration`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader || "",
            },
            body: JSON.stringify({
              spotifyId: spotifyId || artistId,
              ticketmasterId,
              options: options || {
                syncSongs: true,
                syncShows: true,
                createDefaultSetlists: true,
                fullDiscography: true,
              },
            }),
          },
        );

        if (!orchestrationResponse.ok) {
          throw new Error(
            `Orchestration sync failed: ${orchestrationResponse.statusText}`,
          );
        }

        const orchestrationResult = await orchestrationResponse.json();

        return NextResponse.json({
          message: "Artist sync completed via orchestration",
          result: orchestrationResult,
          processed: data?.length || 1,
        });
      }

      case "shows": {
        // Delegate to show sync endpoint
        const showSyncResponse = await fetch(
          `${request.nextUrl.origin}/api/sync/shows`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader || "",
            },
            body: JSON.stringify({
              artistId,
              ...options,
            }),
          },
        );

        if (!showSyncResponse.ok) {
          throw new Error(`Show sync failed: ${showSyncResponse.statusText}`);
        }

        const showSyncResult = await showSyncResponse.json();

        return NextResponse.json({
          message: "Show sync completed",
          result: showSyncResult,
          processed: data?.length || 0,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid sync type. Use: artist, artists, shows" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Sync operation failed:", error);
    return NextResponse.json(
      {
        error: "Sync operation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Sync API endpoint",
    availableTypes: ["artists", "shows"],
  });
}
