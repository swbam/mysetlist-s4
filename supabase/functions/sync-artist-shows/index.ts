// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TICKETMASTER_API_KEY = Deno.env.get('TICKETMASTER_API_KEY');

interface Payload {
  ticketmasterId: string;
  artistId: string; // internal uuid
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    const body = (await req.json()) as Payload;
    if (!body.ticketmasterId || !body.artistId) {
      return new Response(JSON.stringify({ error: 'ticketmasterId and artistId required' }), { status: 400 });
    }
    if (!TICKETMASTER_API_KEY) {
      return new Response(JSON.stringify({ error: 'TICKETMASTER_API_KEY not set' }), { status: 500 });
    }

    const searchUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&attractionId=${body.ticketmasterId}&classificationName=Music&size=100`;
    const res = await fetch(searchUrl);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Ticketmaster request failed' }), { status: 502 });
    }
    const json = await res.json();
    const events = json._embedded?.events || [];
    let inserted = 0;

    for (const event of events) {
      const dateStr = event.dates.start.dateTime || event.dates.start.localDate;
      const date = new Date(dateStr);
      const slug = `${body.artistId}-${event.id}`;

      // 1. Resolve or create venue -----------------------------------------
      let venueId: string | null = null;
      const tmVenue = event._embedded?.venues?.[0];
      if (tmVenue) {
        try {
          const venueSlug = tmVenue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

          // Check existing
          const { data: existingVenue } = await supabase
            .from('venues')
            .select('id')
            .eq('slug', venueSlug)
            .maybeSingle();

          if (existingVenue?.id) {
            venueId = existingVenue.id;
          } else {
            // Insert minimal venue record
            const { data: newVenue, error: venueErr } = await supabase
              .from('venues')
              .insert({
                name: tmVenue.name,
                slug: venueSlug,
                city: tmVenue.city?.name ?? 'Unknown',
                state: tmVenue.state?.name ?? null,
                country: tmVenue.country?.name ?? 'Unknown',
                timezone: tmVenue.timezone ?? 'UTC',
                address: tmVenue.address?.line1 ?? null,
                postal_code: tmVenue.postalCode ?? null,
                latitude: parseFloat(tmVenue.location?.latitude ?? '0'),
                longitude: parseFloat(tmVenue.location?.longitude ?? '0'),
                capacity: tmVenue.capacity ?? null,
                website: tmVenue.url ?? null,
              })
              .select('id')
              .single();

            if (!venueErr && newVenue) venueId = newVenue.id;
          }
        } catch (vErr) {
          console.error('Venue upsert failed', vErr);
        }
      }

      // 2. Upsert show -------------------------------------------------------
      const { error } = await supabase
        .from('shows')
        .upsert({
          headliner_artist_id: body.artistId,
          name: event.name,
          slug,
          date: date.toISOString().split('T')[0],
          status: date > new Date() ? 'upcoming' : 'completed',
          ticket_url: event.url,
          ticketmaster_id: event.id,
          venue_id: venueId,
        }, { onConflict: 'slug' });

      if (!error) inserted++;
    }
    return new Response(JSON.stringify({ success: true, processed: events.length, inserted }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}); 