import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  type?: 'daily' | 'weekly' | 'location' | 'artist';
  location?: { city?: string; state?: string; country?: string };
  artistName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ticketmasterApiKey = Deno.env.get('TICKETMASTER_API_KEY')!;
    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID')!;
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const {
      type = 'daily',
      location,
      artistName,
    } = (await req.json()) as SyncRequest;

    console.log(`Starting ${type} sync...`);

    // Get Spotify access token
    const spotifyToken = await getSpotifyToken(
      spotifyClientId,
      spotifyClientSecret
    );

    // Perform sync based on type
    let results = { shows: 0, artists: 0, venues: 0 };

    switch (type) {
      case 'daily':
        results = await syncDailyShows(
          supabase,
          ticketmasterApiKey,
          spotifyToken
        );
        break;
      case 'weekly':
        results = await syncWeeklyShows(
          supabase,
          ticketmasterApiKey,
          spotifyToken
        );
        break;
      case 'location':
        if (location) {
          results = await syncLocationShows(
            supabase,
            ticketmasterApiKey,
            spotifyToken,
            location
          );
        }
        break;
      case 'artist':
        if (artistName) {
          results = await syncArtistShows(
            supabase,
            ticketmasterApiKey,
            spotifyToken,
            artistName
          );
        }
        break;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getSpotifyToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

async function syncDailyShows(
  supabase: any,
  ticketmasterKey: string,
  spotifyToken: string
) {
  // Get shows for the next 7 days
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${ticketmasterKey}&classificationName=Music&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&size=200`;

  const response = await fetch(url);
  const data = await response.json();

  let showCount = 0;
  let artistCount = 0;
  let venueCount = 0;

  if (data._embedded?.events) {
    for (const event of data._embedded.events) {
      // Process venue
      if (event._embedded?.venues?.[0]) {
        const venue = event._embedded.venues[0];
        const { error: venueError } = await supabase.from('venues').upsert(
          {
            name: venue.name,
            slug: generateSlug(venue.name),
            city: venue.city?.name || '',
            state: venue.state?.stateCode || '',
            country: venue.country?.countryCode || '',
            latitude: Number.parseFloat(venue.location?.latitude || '0'),
            longitude: Number.parseFloat(venue.location?.longitude || '0'),
            external_ids: { ticketmaster_id: venue.id },
          },
          { onConflict: 'slug' }
        );

        if (!venueError) venueCount++;
      }

      // Process artist
      if (event._embedded?.attractions?.[0]) {
        const attraction = event._embedded.attractions[0];

        // Search for artist on Spotify
        const spotifyArtist = await searchSpotifyArtist(
          attraction.name,
          spotifyToken
        );

        const { error: artistError } = await supabase.from('artists').upsert(
          {
            name: attraction.name,
            slug: generateSlug(attraction.name),
            spotify_id: spotifyArtist?.id,
            image_url:
              spotifyArtist?.images?.[0]?.url || attraction.images?.[0]?.url,
            genres: spotifyArtist?.genres || [],
            popularity: spotifyArtist?.popularity || 0,
            external_ids: { ticketmaster_id: attraction.id },
          },
          { onConflict: 'slug' }
        );

        if (!artistError) artistCount++;
      }

      // Process show
      const { error: showError } = await supabase.from('shows').upsert(
        {
          artist_id: await getArtistId(
            supabase,
            event._embedded?.attractions?.[0]?.name
          ),
          venue_id: await getVenueId(
            supabase,
            event._embedded?.venues?.[0]?.name
          ),
          show_date: event.dates.start.dateTime,
          slug: generateSlug(
            `${event._embedded?.attractions?.[0]?.name}-${event._embedded?.venues?.[0]?.name}-${event.dates.start.localDate}`
          ),
          status: 'scheduled',
          external_ids: { ticketmaster_id: event.id },
        },
        { onConflict: 'slug' }
      );

      if (!showError) showCount++;
    }
  }

  return { shows: showCount, artists: artistCount, venues: venueCount };
}

async function syncWeeklyShows(
  supabase: any,
  ticketmasterKey: string,
  spotifyToken: string
) {
  // Similar to daily but with 30 days range
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Reuse daily sync logic with different date range
  return syncDailyShows(supabase, ticketmasterKey, spotifyToken);
}

async function syncLocationShows(
  supabase: any,
  ticketmasterKey: string,
  spotifyToken: string,
  location: any
) {
  let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${ticketmasterKey}&classificationName=Music&size=200`;

  if (location.city) url += `&city=${encodeURIComponent(location.city)}`;
  if (location.state) url += `&stateCode=${location.state}`;
  if (location.country) url += `&countryCode=${location.country}`;

  const response = await fetch(url);
  const data = await response.json();

  // Process events similar to daily sync
  return syncDailyShows(supabase, ticketmasterKey, spotifyToken);
}

async function syncArtistShows(
  supabase: any,
  ticketmasterKey: string,
  spotifyToken: string,
  artistName: string
) {
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${ticketmasterKey}&keyword=${encodeURIComponent(artistName)}&classificationName=Music&size=200`;

  const response = await fetch(url);
  const data = await response.json();

  // Process events similar to daily sync
  return syncDailyShows(supabase, ticketmasterKey, spotifyToken);
}

async function searchSpotifyArtist(name: string, token: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();
  return data.artists?.items?.[0];
}

async function getArtistId(
  supabase: any,
  name: string
): Promise<string | null> {
  if (!name) return null;

  const { data } = await supabase
    .from('artists')
    .select('id')
    .eq('slug', generateSlug(name))
    .single();

  return data?.id || null;
}

async function getVenueId(supabase: any, name: string): Promise<string | null> {
  if (!name) return null;

  const { data } = await supabase
    .from('venues')
    .select('id')
    .eq('slug', generateSlug(name))
    .single();

  return data?.id || null;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
