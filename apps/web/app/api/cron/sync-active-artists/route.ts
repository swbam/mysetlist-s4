import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { runFullImport } from "@repo/external-apis";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const activeArtists = await db.query.artists.findMany({
    where: sql`last_synced_at > NOW() - INTERVAL '30 days'`,
    limit: 100,
  });

  for (const artist of activeArtists) {
    await runFullImport(artist.id);
  }

  return NextResponse.json({
    success: true,
    synced: activeArtists.length,
  });
}
