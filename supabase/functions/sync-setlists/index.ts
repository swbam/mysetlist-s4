import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SetlistFmSetlist {
  id: string;
  eventDate: string;
  artist: {
    mbid: string;
    name: string;
  };
  venue: {
    id: string;
    name: string;
    city: {
      name: string;
      state?: string;
      country: {
        code: string;
        name: string;
      };
    };
  };
  sets: {
    set: Array<{
      name?: string;
      encore?: number;
      song: Array<{
        name: string;
        info?: string;
        tape?: boolean;
      }>;
    }>;
  };
  tour?: {
    name: string;
  };
  url: string;
}

async function fetchSetlistFmSetlists(params: {
  artistName?: string;
  artistMbid?: string;
  date?: string;
  year?: string;
  p?: number;
}): Promise<SetlistFmSetlist[]> {
  const apiKey = Deno.env.get('SETLIST_FM_API_KEY');

  if (!apiKey) {
    throw new Error('Setlist.fm API key not configured');
  }

  const url = new URL('https://api.setlist.fm/rest/1.0/search/setlists');

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value.toString());
    }
  });

  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch setlists from Setlist.fm: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.setlist || [];
}

async function fetchSetlistById(setlistId: string): Promise<SetlistFmSetlist> {
  const apiKey = Deno.env.get('SETLIST_FM_API_KEY');

  if (!apiKey) {
    throw new Error('Setlist.fm API key not configured');
  }

  const response = await fetch(
    `https://api.setlist.fm/rest/1.0/setlist/${setlistId}`,
    {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch setlist from Setlist.fm: ${response.statusText}`
    );
  }

  return await response.json();
}

function formatSetlistData(setlist: SetlistFmSetlist) {
  const songs: Array<{ name: string; position: number; notes?: string }> = [];
  let position = 0;

  if (setlist.sets?.set) {
    for (const set of setlist.sets.set) {
      if (set.song) {
        for (const song of set.song) {
          songs.push({
            name: song.name,
            position: position++,
            notes: song.info || (song.tape ? '(tape)' : undefined),
          });
        }
      }
    }
  }

  return songs;
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

    const { setlistId, showId, artistName, date } = await req.json();

    let setlist: SetlistFmSetlist;

    if (setlistId) {
      // Fetch specific setlist by ID
      setlist = await fetchSetlistById(setlistId);
    } else if (artistName && date) {
      // Search for setlist by artist and date
      const setlists = await fetchSetlistFmSetlists({
        artistName,
        date,
        p: 1,
      });

      if (setlists.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No setlist found for the specified criteria',
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      setlist = setlists[0];
    } else {
      return new Response(
        JSON.stringify({
          error: 'Either setlistId or both artistName and date are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Format setlist songs
    const songs = formatSetlistData(setlist);

    if (songs.length === 0) {
      return new Response(JSON.stringify({ error: 'Setlist has no songs' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If showId is provided, create/update setlist for that show
    if (showId) {
      // Verify show exists
      const { data: show, error: showError } = await supabase
        .from('shows')
        .select('*, headliner_artist:artists!shows_headliner_artist_id_fkey(*)')
        .eq('id', showId)
        .single();

      if (showError || !show) {
        return new Response(JSON.stringify({ error: 'Show not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user info from auth header (if available)
      const authHeader = req.headers.get('Authorization');
      let userId = null as string | null;

      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const {
          data: { user },
        } = await supabase.auth.getUser(token);
        userId = user?.id ?? null;
      }

      // Create setlist
      const { data: newSetlist, error: setlistError } = await supabase
        .from('setlists')
        .insert({
          show_id: showId,
          created_by: userId,
          songs: JSON.stringify(songs),
          source: 'setlist.fm',
          setlistfm_id: setlist.id,
          is_verified: true, // Since it's from official source
          vote_count: 0,
        })
        .select()
        .single();

      if (setlistError) {
        throw setlistError;
      }

      // Update show's setlistfm_id if not already set
      if (!show.setlistfm_id) {
        await supabase
          .from('shows')
          .update({ setlistfm_id: setlist.id })
          .eq('id', showId);
      }

      // Increment setlist count for the show
      await supabase
        .from('shows')
        .update({ setlist_count: (show.setlist_count || 0) + 1 })
        .eq('id', showId);

      return new Response(
        JSON.stringify({
          setlist: newSetlist,
          songs,
          source: 'setlist.fm',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return setlist data without creating in database
    return new Response(
      JSON.stringify({
        setlist: {
          id: setlist.id,
          artist: setlist.artist.name,
          venue: setlist.venue.name,
          date: setlist.eventDate,
          songs,
          tour: setlist.tour?.name,
          url: setlist.url,
        },
        source: 'setlist.fm',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


