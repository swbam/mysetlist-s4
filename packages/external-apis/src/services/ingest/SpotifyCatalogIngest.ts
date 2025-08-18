import { db, songs, artistSongs } from "@repo/database";
import { SpotifyClient } from "../../clients/spotify";
import { SpotifyTrack } from "../../types/spotify";
import { eq } from "drizzle-orm";
import { pLimit } from "../../utils/concurrency";
import { report } from "../progress/ProgressBus";

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

export class SpotifyCatalogIngestService {
  private spotifyClient: SpotifyClient;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
  }

  async ingestStudioCatalog(artistId: string, spotifyArtistId: string) {
    await this.spotifyClient.authenticate();

    const albumsAll = await this.spotifyClient.getArtistAlbums(spotifyArtistId);
    const albums = albumsAll.items.filter(
      (a: any) => !isLikelyLiveAlbum(a?.name),
    );

    const limit = pLimit(10);
    const albumTrackArrays = await Promise.allSettled(
      albums.map((a: any) =>
        limit(() => this.spotifyClient.getArtistAlbums(a.id)),
      ),
    );
    const roughTracks = albumTrackArrays.flatMap((r: any) =>
      r.status === "fulfilled" ? r.value.items : [],
    );

    const filteredByTitle = roughTracks.filter(
      (t: any) => !isLikelyLiveTitle(t?.name),
    );

    const trackIds = Array.from(
      new Set(filteredByTitle.map((t: any) => t.id)),
    ).filter(Boolean) as string[];
    const details = await this.spotifyClient.getTracksDetails(trackIds);

    const features = await this.spotifyClient.getAudioFeatures(trackIds);
    const featMap = new Map(features.audio_features.map((f) => [f.id, f]));

    const studioDetails = details.tracks.filter((d: SpotifyTrack) => {
      const f = featMap.get(d.id);
      return f && f.liveness <= LIVENESS_THRESHOLD;
    });

    const byKey = new Map<string, any>();
    for (const t of studioDetails) {
      const key =
        t?.external_ids?.isrc ??
        `t:${(t.name || "").toLowerCase().trim()}:d:${Math.round(
          (t.duration_ms || 0) / 1000,
        )}`;
      const prev = byKey.get(key);
      if (!prev || (t.popularity ?? 0) > (prev.popularity ?? 0))
        byKey.set(key, t);
    }
    const unique = Array.from(byKey.values());

    await db.transaction(async (tx) => {
      for (const t of unique) {
        const song = await tx
          .insert(songs)
          .values(this.mapSong(t))
          .onConflictDoUpdate({
            target: songs.spotifyId,
            set: this.mapSong(t),
          })
          .returning();

        await tx
          .insert(artistSongs)
          .values({ artistId, songId: song[0].id })
          .onConflictDoNothing();
      }
    });
  }

  private mapSong(track: SpotifyTrack) {
    return {
      spotifyId: track.id,
      name: track.name,
      albumName: track.album.name,
      artist: track.artists[0].name,
      albumArtUrl: track.album.images[0]?.url ?? null,
      releaseDate: new Date(track.album.release_date).toISOString(),
      durationMs: track.duration_ms,
      popularity: track.popularity,
      previewUrl: track.preview_url,
      isExplicit: track.explicit,
      isPlayable: track.is_playable,
      isLive: isLikelyLiveTitle(track.name),
      isRemix: track.name.toLowerCase().includes("remix"),
      isrc: track.external_ids?.isrc ?? null,
    };
  }
}
