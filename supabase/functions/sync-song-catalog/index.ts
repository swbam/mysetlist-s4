// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
// Edge runtime automatically provided by Supabase – no explicit import required
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Payload {
  spotifyId: string;
  artistId: string; // internal UUID in db
}

class SpotifyClient {
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  async auth() {
    if (this.accessToken && Date.now() < this.tokenExpiry) return;
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`)}`,
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
  }

  async fetchAll<T>(url: string): Promise<T[]> {
    let items: T[] = [];
    let next: string | null = url;
    while (next) {
      await this.auth();
      const res = await fetch(next, { headers: { Authorization: `Bearer ${this.accessToken}` } });
      if (!res.ok) throw new Error(`Spotify error ${res.status}`);
      const json: any = await res.json();
      items = items.concat(json.items || json.tracks?.items || []);
      next = json.next;
    }
    return items;
  }

  async getAlbums(artistId: string) {
    return this.fetchAll<any>(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album%2Csingle%2Cappears_on&limit=50`);
  }

  async getAlbumTracks(albumId: string) {
    return this.fetchAll<any>(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`);
  }
}

const spotify = new SpotifyClient();

Deno.serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as Payload;
    if (!payload.spotifyId || !payload.artistId) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    // fetch albums
    const albums = await spotify.getAlbums(payload.spotifyId);
    const trackPromises: Promise<any[]>[] = [];
    for (const album of albums) {
      trackPromises.push(spotify.getAlbumTracks(album.id));
    }
    const albumTracksArrays = await Promise.all(trackPromises);
    const tracks = albumTracksArrays.flat();

    // Build rows
    const rows = tracks.map((t) => ({
      spotify_id: t.id,
      title: t.name,
      artist: t.artists?.[0]?.name,
      album: t.album?.name ?? null,
      album_art_url: t.album?.images?.[0]?.url ?? null,
      release_date: t.album?.release_date ? new Date(t.album.release_date).toISOString() : null,
      duration_ms: t.duration_ms,
      popularity: t.popularity ?? 0,
      preview_url: t.preview_url,
      is_explicit: t.explicit ?? false,
      is_playable: t.is_playable !== false,
    }));

    // chunk insert 500
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await supabase.from('songs').insert(chunk).onConflict('spotify_id').upsert();
    }

    // update artist timestamp
    await supabase.from('artists')
      .update({ song_catalog_synced_at: new Date().toISOString() })
      .eq('id', payload.artistId);

    // ------------------------------------------------------------------
    // Update artist_stats.total_songs (create row if missing)
    // ------------------------------------------------------------------
    const { data: statRow } = await supabase
      .from('artist_stats')
      .select('id, total_songs')
      .eq('artist_id', payload.artistId)
      .maybeSingle();

    const newTotal = (statRow?.total_songs ?? 0) + rows.length;

    if (statRow?.id) {
      await supabase
        .from('artist_stats')
        .update({ total_songs: newTotal, updated_at: new Date().toISOString() })
        .eq('id', statRow.id);
    } else {
      await supabase
        .from('artist_stats')
        .insert({ artist_id: payload.artistId, total_songs: newTotal });
    }

    return new Response(
      JSON.stringify({ success: true, imported: rows.length, totalSongs: newTotal }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('sync-song-catalog error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}); 