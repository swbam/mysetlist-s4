import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Parse request to determine what type of sync to perform
    const { type = 'all', limit = 10 } = await req.json();

    const results = {
      artists: { synced: 0, errors: 0 },
      shows: { synced: 0, errors: 0 },
      setlists: { synced: 0, errors: 0 },
    };

    // Sync popular/trending artists
    if (type === 'all' || type === 'artists') {
      console.log('Starting artist sync...');
      
      // Get artists that need syncing (not synced in last 24 hours)
      const { data: artistsToSync } = await supabase
        .from('artists')
        .select('*')
        .or('last_synced_at.is.null,last_synced_at.lt.now() - interval \'24 hours\'')
        .order('follower_count', { ascending: false })
        .limit(limit);

      if (artistsToSync) {
        for (const artist of artistsToSync) {
          try {
            if (artist.spotify_id) {
              // Call sync-artists function
              const response = await fetch(`${supabaseUrl}/functions/v1/sync-artists`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  spotifyId: artist.spotify_id,
                  forceSync: true,
                }),
              });

              if (response.ok) {
                results.artists.synced++;
              } else {
                results.artists.errors++;
                console.error(`Failed to sync artist ${artist.name}:`, await response.text());
              }
            }
          } catch (error) {
            results.artists.errors++;
            console.error(`Error syncing artist ${artist.name}:`, error);
          }
        }
      }
    }

    // Sync upcoming shows
    if (type === 'all' || type === 'shows') {
      console.log('Starting shows sync...');
      
      // Get top artists to sync their shows
      const { data: topArtists } = await supabase
        .from('artists')
        .select('*')
        .order('follower_count', { ascending: false })
        .limit(limit);

      if (topArtists) {
        for (const artist of topArtists) {
          try {
            // Call sync-shows function
            const response = await fetch(`${supabaseUrl}/functions/v1/sync-shows`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                artistName: artist.name,
                dateRange: {
                  start: new Date().toISOString().split('T')[0],
                  end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ahead
                },
              }),
            });

            if (response.ok) {
              const data = await response.json();
              results.shows.synced += data.syncedCount || 0;
            } else {
              results.shows.errors++;
              console.error(`Failed to sync shows for ${artist.name}:`, await response.text());
            }
          } catch (error) {
            results.shows.errors++;
            console.error(`Error syncing shows for ${artist.name}:`, error);
          }
        }
      }
    }

    // Sync recent setlists
    if (type === 'all' || type === 'setlists') {
      console.log('Starting setlists sync...');
      
      // Get recent shows without setlists
      const { data: showsWithoutSetlists } = await supabase
        .from('shows')
        .select('*, headliner_artist:artists!shows_headliner_artist_id_fkey(*)')
        .eq('status', 'completed')
        .eq('setlist_count', 0)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days
        .limit(limit);

      if (showsWithoutSetlists) {
        for (const show of showsWithoutSetlists) {
          try {
            // Call sync-setlists function
            const response = await fetch(`${supabaseUrl}/functions/v1/sync-setlists`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                showId: show.id,
                artistName: show.headliner_artist.name,
                date: show.date,
              }),
            });

            if (response.ok) {
              results.setlists.synced++;
            } else {
              const error = await response.text();
              // Don't count as error if setlist simply doesn't exist yet
              if (!error.includes('No setlist found')) {
                results.setlists.errors++;
                console.error(`Failed to sync setlist for show ${show.id}:`, error);
              }
            }
          } catch (error) {
            results.setlists.errors++;
            console.error(`Error syncing setlist for show ${show.id}:`, error);
          }
        }
      }
    }

    // Update trending scores
    console.log('Updating trending scores...');
    
    // Update artist trending scores based on recent activity
    await supabase.rpc('update_artist_trending_scores');
    
    // Update show trending scores
    await supabase.rpc('update_show_trending_scores');

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scheduled sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});