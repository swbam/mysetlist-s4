"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestStudioCatalog = ingestStudioCatalog;
const database_1 = require("@repo/database");
const spotify_1 = require("../../clients/spotify");
const LIVENESS_THRESHOLD = 0.8; // > 0.8 considered likely-live
function isLikelyLiveAlbum(name) {
    const n = (name || "").toLowerCase();
    return n.includes("live") || n.includes("unplugged") || n.includes("concert") || n.includes("mtv live") || n.includes("at ");
}
function isLikelyLiveTitle(name) {
    const n = (name || "").toLowerCase();
    return n.includes("(live") || n.includes(" - live") || n.includes("live at") || n.includes("unplugged");
}
async function ingestStudioCatalog(artistId, spotifyArtistId) {
    const spotifyClient = new spotify_1.SpotifyClient({});
    await spotifyClient.authenticate();
    const allAlbums = await spotifyClient.getArtistAlbums(spotifyArtistId);
    const albums = allAlbums.items.filter((a) => !isLikelyLiveAlbum(a?.name));
    // Get tracks from each album using the SpotifyClient properly
    const albumTrackArrays = await Promise.allSettled(albums.map(async (album) => {
        try {
            // Use a simple fetch since we need album tracks, not artist albums
            const albumTracksResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, {
                headers: { Authorization: `Bearer ${spotifyClient.accessToken}` }
            });
            if (!albumTracksResponse.ok)
                return { items: [] };
            return albumTracksResponse.json();
        }
        catch (error) {
            console.error(`Failed to get tracks for album ${album.id}:`, error);
            return { items: [] };
        }
    }));
    const roughTracks = albumTrackArrays.flatMap((r) => r.status === "fulfilled" ? r.value.items : []);
    const filteredByTitle = roughTracks.filter((t) => !isLikelyLiveTitle(t?.name));
    const trackIds = Array.from(new Set(filteredByTitle.map((t) => t.id))).filter(Boolean);
    const details = await spotifyClient.getTracksDetails(trackIds);
    const features = await spotifyClient.getAudioFeatures(trackIds);
    const featMap = new Map(features.audio_features.map((f) => [f.id, f]));
    const studioDetails = details.tracks.filter((d) => {
        const f = featMap.get(d.id);
        return f && f.liveness <= LIVENESS_THRESHOLD;
    });
    const byKey = new Map();
    for (const t of studioDetails) {
        const key = t?.external_ids?.isrc ?? `t:${(t.name || "").toLowerCase().trim()}:d:${Math.round((t.duration_ms || 0) / 1000)}`;
        const prev = byKey.get(key);
        if (!prev || (t.popularity ?? 0) > (prev.popularity ?? 0)) {
            byKey.set(key, t);
        }
    }
    const unique = Array.from(byKey.values());
    for (const t of unique) {
        const song = await database_1.db
            .insert(database_1.songs)
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
            target: database_1.songs.spotifyId,
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
            await database_1.db.insert(database_1.artistSongs).values({
                artistId,
                songId: song[0].id,
            }).onConflictDoNothing();
        }
    }
}
