import { db } from "@repo/database";
import { artistSongs, songs } from "@repo/database";
import { SpotifyClient } from "../../clients/spotify";
import { pLimit } from "../../utils/concurrency";

const LIVENESS_THRESHOLD = 0.8; // > 0.8 considered likely-live

function isLikelyLiveAlbum(name: string) {
  const n = (name || "").toLowerCase();
  return (
    n.includes("live") ||
    n.includes("unplugged") ||
    n.includes("concert") ||
    n.includes("mtv live") ||
    n.includes("at ")
  );
}

function isLikelyLiveTitle(name: string) {
  const n = (name || "").toLowerCase();
  return (
    n.includes("(live") ||
    n.includes(" - live") ||
    n.includes("live at") ||
    n.includes("unplugged")
  );
}

export async function ingestStudioCatalog(
  artistId: string,
  spotifyArtistId: string,
) {
  const spotifyClient = new SpotifyClient({});
  await spotifyClient.authenticate();

  // 1) Albums (studio only by include_groups + quick name filter)
  const albumsAll = await spotifyClient.listAllAlbums(spotifyArtistId);
  const albums = albumsAll.filter((a: any) => !isLikelyLiveAlbum(a?.name));

  // 2) Tracks (bounded parallelism per album)
  const limit = pLimit(10);
  const albumTrackArrays = await Promise.allSettled(
    albums.map((a: any) => limit(() => spotifyClient.listAlbumTracks(a.id))),
  );
  const roughTracks = albumTrackArrays.flatMap((r: any) =>
    r.status === "fulfilled" ? r.value : [],
  );
  // Pre-filter by title to avoid obvious lives early
  const filteredByTitle = roughTracks.filter(
    (t: any) => !isLikelyLiveTitle(t?.name),
  );

  // 3) Fetch full track details for ISRC + popularity (batch requests)
  const trackIds = Array.from(
    new Set(filteredByTitle.map((t: any) => t.id)),
  ).filter(Boolean) as string[];
  const details: any[] = [];
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    const batchDetails = await spotifyClient.getTracksDetails(batch);
    details.push(...(batchDetails.tracks ?? []));
  }

  // 4) Audio features to exclude hidden live (applause, room) - batch requests
  const features: any[] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100);
    const batchFeatures = await spotifyClient.getAudioFeatures(batch);
    features.push(...(batchFeatures.audio_features ?? []).filter(Boolean));
  }
  const featMap = new Map(features.map((f: any) => [f.id, f]));

  // 5) Filter to studio-only: liveness <= threshold
  const studioDetails = details.filter((d: any) => {
    const f = featMap.get(d.id);
    return f && f.liveness <= LIVENESS_THRESHOLD;
  });

  // 6) Deduplicate strictly by ISRC, fallback to (title+duration)
  const byKey = new Map<string, any>();
  for (const t of studioDetails) {
    const key =
      t?.external_ids?.isrc ??
      `t:${(t.name || "").toLowerCase().trim()}:d:${Math.round((t.duration_ms || 0) / 1000)}`;
    const prev = byKey.get(key);
    if (!prev || (t.popularity ?? 0) > (prev.popularity ?? 0)) {
      byKey.set(key, t);
    }
  }
  const unique = Array.from(byKey.values());

  // 7) Persist (upsert songs; connect in join table)
  await db.transaction(async (tx) => {
    for (const t of unique) {
      const song = await tx
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
          artist: t.artists?.[0]?.name ?? null,
        })
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            name: t.name,
            albumName: t?.album?.name ?? null,
            popularity: t?.popularity ?? null,
            isrc: t?.external_ids?.isrc ?? null,
            durationMs: t?.duration_ms ?? null,
            isLive: false,
            isRemix: (t.name || "").toLowerCase().includes("remix"),
          },
        })
        .returning();

      if (song[0]) {
        await tx
          .insert(artistSongs)
          .values({
            artistId,
            songId: song[0].id,
          })
          .onConflictDoNothing();
      }
    }
  });
}
