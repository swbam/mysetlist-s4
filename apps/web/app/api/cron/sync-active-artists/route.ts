import { NextResponse } from "next/server";
import { db, artists } from "@repo/database";
import { runFullImport } from "@repo/external-apis";
import { sql } from "drizzle-orm";

export async function GET(_request: Request) {
  const authHeader = _request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeArtists = await db
    .select()
    .from(artists)
    .where(sql`last_synced_at > NOW() - INTERVAL '30 days'`)
    .limit(100);

  for (const artist of activeArtists) {
    await runFullImport(artist.id);
  }

  return NextResponse.json({
    success: true,
    synced: activeArtists.length,
  });
}
