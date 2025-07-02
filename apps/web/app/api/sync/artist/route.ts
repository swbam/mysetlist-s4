import { NextRequest, NextResponse } from 'next/server';
import { db, artists } from '@repo/database';

// POST /api/sync/artist
// Body: { artistId: string }
// Triggers Supabase edge functions (sync-artists, sync-artist-shows, sync-song-catalog)
export async function POST(req: NextRequest) {
  try {
    const { artistId } = await req.json() as { artistId?: string };
    if (!artistId) {
      return NextResponse.json({ error: 'artistId required' }, { status: 400 });
    }

    // Look up extra IDs for payloads
    const artist = await db.query.artists.findFirst({ where: (a, { eq }) => eq(a.id, artistId) });
    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env vars missing' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    };

    // Fire-and-forget helper
    const invoke = (fn: string, payload: Record<string, unknown>) =>
      fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).then(() => {}).catch(console.error);

    // Kick off edge functions in parallel – we don't await
    if (artist.spotifyId) {
      invoke('sync-artists', { spotifyId: artist.spotifyId, forceSync: true });
      invoke('sync-song-catalog', { spotifyId: artist.spotifyId, artistId: artist.id });
    }
    if (artist.ticketmasterId) {
      invoke('sync-artist-shows', { ticketmasterId: artist.ticketmasterId, artistId: artist.id });
    }

    // Always attempt to sync shows via name search (broader)
    invoke('sync-shows', { artistName: artist.name });

    return NextResponse.json({ queued: true });
  } catch (e: any) {
    console.error('sync/artist route error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
} 