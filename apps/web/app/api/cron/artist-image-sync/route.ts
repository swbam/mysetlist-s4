import { db, artists, eq, isNull } from "@repo/database";
import { SpotifyClient } from "@repo/external-apis/src/clients/spotify";
import { NextResponse } from "next/server";

async function uploadFromUrl(_bucket: string, _key: string, url: string): Promise<string> {
  // Placeholder: return original URL; integrate storage later
  return url;
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("unauthorized", { status: 401 });

  const batch = await db.query.artists.findMany({
    where: isNull(artists.smallImageUrl),
    limit: 50,
  });

  const spotify = new SpotifyClient({});
  await spotify.authenticate();

  for (const a of batch) {
    if (!a.spotifyId) continue;
    try {
      const sp = await spotify.getArtist(a.spotifyId);
      const img = sp?.images?.[0]?.url;
      if (!img) continue;
      const url = await uploadFromUrl("artist-images", `${a.id}.jpg`, img);
      await db.update(artists).set({ smallImageUrl: url }).where(eq(artists.id, a.id));
    } catch {}
  }
  return NextResponse.json({ ok: true });
}

