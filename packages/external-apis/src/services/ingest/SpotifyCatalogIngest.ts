import { db } from "@repo/database";
import { songs, artistSongs } from "@repo/database";
import { SpotifyClient } from "../../clients/spotify";
import { eq } from "drizzle-orm";
import type { SpotifyTrack } from "../../types/spotify";

const LIVENESS_THRESHOLD = 0.8; // > 0.8 considered likely-live

function isLikelyLiveAlbum(name: string) {
  const n = (name || "").toLowerCase();
  return n.includes("live") || n.includes("unplugged") || n.includes("concert") || n.includes("mtv live") || n.includes("at ");
}

function isLikelyLiveTitle(name: string) {
  const n = (name || "").toLowerCase();
  return n.includes("(live") || n.includes(" - live") || n.includes("live at") || n.includes("unplugged");
}

export async function ingestStudioCatalog(artistId: string, spotifyArtistId: string) {
  const spotifyClient = new SpotifyClient({});
  await spotifyClient.authenticate();

  const allAlbums = await spotifyClient.getArtistAlbums(spotifyArtistId);
  const albums = allAlbums.items.filter((a: any) => !isLikelyLiveAlbum(a?.name));

  const albumTrackArrays = await Promise.allSettled(
    albums.map((a: any) => spotifyClient.getArtistAlbums(a.id))
  );

  const roughTracks = albumTrackArrays.flatMap((r: any) =>
    r.status === "fulfilled" ? r.value.items : []
  );

  const filteredByTitle = roughTracks.filter((t: any) => !isLikelyLiveTitle(t?.name));

  const trackIds = Array.from(new Set(filteredByTitle.map((t: any) => t.id))).filter(Boolean) as string[];
  const details = await spotifyClient.getTracksDetails(trackIds);

  const features = await spotifyClient.getAudioFeatures(trackIds);
  const featMap = new Map(features.audio_features.map((f: any) => [f.id, f]));

  const studioDetails = details.tracks.filter((d: any) => {
    const f = featMap.get(d.id);
    return f && f.liveness <= LIVENESS_THRESHOLD;
  });

  const byKey = new Map<string, any>();
  for (const t of studioDetails) {
    const key = t?.external_ids?.isrc ?? `t:${(t.name || "").toLowerCase().trim()}:d:${Math.round((t.duration_ms || 0) / 1000)}`;
    const prev = byKey.get(key);
    if (!prev || (t.popularity ?? 0) > (prev.popularity ?? 0)) {
      byKey.set(key, t);
    }
  }
  const unique = Array.from(byKey.values());

  for (const t of unique) {
    const song = await db
      .insert(songs)
      .values({
        spotifyId: t.id,
        name: t.name,
        albumName: t?.album?.name ?? null,
        popularity: t?.popularity ?? null,
        isrc: t?.external_ids?.isrc ?? null,
        durationMs: t?.duration_ms ?? null,
        isLive: false,
        isRemix: (t.name || "").toLowerCase().includes("remix"),
        artist: t.artists[0].name,
      })
      .onConflictDoUpdate({
        target: songs.spotifyId,
        set: {
            name: t.name,
            albumName: t?.album?.name ?? null,
            popularity: t?.popularity ?? null,
            isrc: t?.external_ids?.isrc ?? null,
            durationMs: t?.duration_ms ?? null,
        }
      })
      .returning();

    if (song[0]) {
        await db.insert(artistSongs).values({
            artistId,
            songId: song[0].id,
        }).onConflictDoNothing();
    }
  }
}
