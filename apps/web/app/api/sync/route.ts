import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

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
    const { type, data, artistId, ticketmasterId } = body;

    // Basic sync operations
    switch (type) {
      case "artist":
      case "artists":
        // Handle individual artist sync
        console.log(`Background sync for artist: ${artistId || ticketmasterId}`);
        
        // For now, just acknowledge the sync request
        // In a full implementation, this would:
        // - Fetch shows from Ticketmaster
        // - Update artist data from Spotify
        // - Sync venue information
        // - etc.
        
        return NextResponse.json({
          message: "Artist sync initiated",
          artistId: artistId || ticketmasterId,
          processed: data?.length || 1,
        });
      case "shows":
        // Handle show sync
        return NextResponse.json({
          message: "Show sync initiated", 
          processed: data?.length || 0,
        });
      default:
        return NextResponse.json(
          { error: "Invalid sync type. Use: artist, artists, shows" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Sync operation failed" },
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