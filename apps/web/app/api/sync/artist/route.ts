import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmAttractionId, ticketmasterId, artistName, spotifyId, options } = body || {};

    const tokens = [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.ADMIN_API_KEY].filter(Boolean) as string[];
    const authHeader = tokens[0] ? `Bearer ${tokens[0]}` : "";

    const r = await fetch(`${request.nextUrl.origin}/api/sync/orchestration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        ticketmasterId: tmAttractionId || ticketmasterId,
        artistName,
        spotifyId,
        options: {
          syncSongs: true,
          syncShows: true,
          createDefaultSetlists: true,
          fullDiscography: true,
          ...(options || {}),
        },
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ error: txt }, { status: r.status });
    }

    const data = await r.json();
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error("/api/sync/artist failed", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Artist sync API endpoint",
    description: "POST to this endpoint to trigger background artist sync",
    requiredFields: ["ticketmasterId OR spotifyId"],
    optionalFields: ["artistName", "syncType"],
    syncTypes: ["basic", "full", "shows_only"],
  });
}
