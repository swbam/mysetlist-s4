import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; height: number; width: number }[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
}

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchSpotifyArtist(
  spotifyId: string,
  accessToken: string
): Promise<SpotifyArtist> {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch artist from Spotify: ${response.statusText}`
    );
  }

  return await response.json();
}

async function searchSpotifyArtist(
  query: string,
  accessToken: string
): Promise<SpotifyArtist[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to search artists on Spotify: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.artists.items;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { spotifyId, artistName, forceSync } = await req.json();

    if (!spotifyId && !artistName) {
      return new Response(
        JSON.stringify({ error: 'Either spotifyId or artistName is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if artist already exists and is recently synced
    if (spotifyId && !forceSync) {
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('*')
        .eq('spotify_id', spotifyId)
        .single();

      if (existingArtist?.last_synced_at) {
        const lastSynced = new Date(existingArtist.last_synced_at);
        const hoursSinceSync =
          (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);

        // If synced within last 24 hours, return existing data
        if (hoursSinceSync < 24) {
          return new Response(
            JSON.stringify({ artist: existingArtist, cached: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get Spotify access token
    const accessToken = await getSpotifyAccessToken();

    let spotifyArtist: SpotifyArtist;

    if (spotifyId) {
      // Fetch artist by ID
      spotifyArtist = await fetchSpotifyArtist(spotifyId, accessToken);
    } else {
      // Search for artist by name
      const searchResults = await searchSpotifyArtist(artistName!, accessToken);

      if (searchResults.length === 0) {
        return new Response(JSON.stringify({ error: 'Artist not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use the first result (most relevant)
      spotifyArtist = searchResults[0];
    }

    // Prepare artist data for database
    const artistData = {
      spotify_id: spotifyArtist.id,
      name: spotifyArtist.name,
      slug: spotifyArtist.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      image_url: spotifyArtist.images[0]?.url || null,
      small_image_url:
        spotifyArtist.images[2]?.url || spotifyArtist.images[1]?.url || null,
      genres: JSON.stringify(spotifyArtist.genres),
      popularity: spotifyArtist.popularity,
      followers: spotifyArtist.followers.total,
      external_urls: JSON.stringify(spotifyArtist.external_urls),
      last_synced_at: new Date().toISOString(),
      verified: spotifyArtist.popularity > 50, // Simple verification based on popularity
    };

    // Upsert artist in database
    const { data: artist, error } = await supabase
      .from('artists')
      .upsert(artistData, {
        onConflict: 'spotify_id',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update artist stats
    await supabase.from('artist_stats').upsert(
      {
        artist_id: artist.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'artist_id',
      }
    );

    return new Response(JSON.stringify({ artist, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error syncing artist:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
