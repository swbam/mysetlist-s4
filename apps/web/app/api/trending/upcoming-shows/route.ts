import { createServiceClient } from '~/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // Get upcoming shows with high activity
    const { data: upcomingShows } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        date,
        ticket_url,
        artist:artists!shows_headliner_artist_id_fkey(name, slug),
        venue:venues(name, city, state),
        view_count
      `)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('view_count', { ascending: false })
      .order('date', { ascending: true })
      .limit(6);

    if (!upcomingShows || upcomingShows.length === 0) {
      return NextResponse.json({ shows: [] });
    }

    // Transform to expected format
    const shows = upcomingShows
      .filter(show => show.artist && show.artist.length > 0)
      .slice(0, 3)
      .map(show => {
        const firstArtist = show.artist![0];
        if (!firstArtist) {
          return null;
        }
        return {
          id: show.id,
          artist: firstArtist.name,
          venue: show.venue?.[0]?.name || 'Venue TBA',
          date: show.date,
          ticketsLeft: show.ticket_url ? null : undefined, // TODO: Integrate with real ticket availability API
        };
      })
      .filter(show => show !== null);

    return NextResponse.json({ shows });
  } catch (_error) {
    return NextResponse.json({ shows: [] });
  }
}