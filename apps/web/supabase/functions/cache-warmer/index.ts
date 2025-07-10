import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CacheWarmRequest {
  target: 'trending' | 'popular' | 'recent' | 'all';
  priority: 'high' | 'medium' | 'low';
  maxItems?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const appUrl = Deno.env.get('APP_URL') || 'https://mysetlist.vercel.app';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { target, priority, maxItems = 50 } = (await req.json()) as CacheWarmRequest;

    const results = {
      target,
      priority,
      warmed: 0,
      failed: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    const startTime = Date.now();

    switch (target) {
      case 'trending':
        await warmTrendingContent(supabase, appUrl, maxItems, results);
        break;
      case 'popular':
        await warmPopularContent(supabase, appUrl, maxItems, results);
        break;
      case 'recent':
        await warmRecentContent(supabase, appUrl, maxItems, results);
        break;
      case 'all':
        await warmTrendingContent(supabase, appUrl, maxItems, results);
        await warmPopularContent(supabase, appUrl, maxItems, results);
        await warmRecentContent(supabase, appUrl, maxItems, results);
        break;
    }

    results.duration = Date.now() - startTime;

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function warmTrendingContent(supabase: any, appUrl: string, maxItems: number, results: any) {
  // Get trending artists
  const { data: trendingArtists } = await supabase
    .from('artists')
    .select('id, slug, name, trending_score')
    .gt('trending_score', 0)
    .order('trending_score', { ascending: false })
    .limit(Math.min(maxItems, 20));

  // Get trending shows
  const { data: trendingShows } = await supabase
    .from('shows')
    .select('id, slug, trending_score, artists(name)')
    .gt('trending_score', 0)
    .order('trending_score', { ascending: false })
    .limit(Math.min(maxItems, 20));

  // Warm trending API endpoint
  await warmEndpoint(`${appUrl}/api/trending`, results);
  await warmEndpoint(`${appUrl}/api/trending?period=day`, results);
  await warmEndpoint(`${appUrl}/api/trending?period=week`, results);

  // Warm individual trending artists
  for (const artist of trendingArtists || []) {
    await warmEndpoint(`${appUrl}/api/artists/${artist.slug}`, results);
    await warmEndpoint(`${appUrl}/artists/${artist.slug}`, results);
  }

  // Warm individual trending shows
  for (const show of trendingShows || []) {
    await warmEndpoint(`${appUrl}/api/shows/${show.slug}`, results);
    await warmEndpoint(`${appUrl}/shows/${show.slug}`, results);
  }
}

async function warmPopularContent(supabase: any, appUrl: string, maxItems: number, results: any) {
  // Get most popular artists by view count
  const { data: popularArtists } = await supabase
    .from('artists')
    .select('id, slug, name, view_count, follower_count')
    .order('view_count', { ascending: false })
    .limit(Math.min(maxItems, 25));

  // Get most popular shows by view count
  const { data: popularShows } = await supabase
    .from('shows')
    .select('id, slug, view_count, artists(name)')
    .order('view_count', { ascending: false })
    .limit(Math.min(maxItems, 25));

  // Get most popular venues
  const { data: popularVenues } = await supabase
    .from('venues')
    .select('id, slug, name, city, state')
    .order('view_count', { ascending: false })
    .limit(Math.min(maxItems, 15));

  // Warm popular artists
  for (const artist of popularArtists || []) {
    await warmEndpoint(`${appUrl}/api/artists/${artist.slug}`, results);
    await warmEndpoint(`${appUrl}/artists/${artist.slug}`, results);
    
    // Warm artist's shows
    await warmEndpoint(`${appUrl}/api/artists/${artist.slug}/shows`, results);
    await warmEndpoint(`${appUrl}/api/artists/${artist.slug}/songs`, results);
  }

  // Warm popular shows
  for (const show of popularShows || []) {
    await warmEndpoint(`${appUrl}/api/shows/${show.slug}`, results);
    await warmEndpoint(`${appUrl}/shows/${show.slug}`, results);
    
    // Warm show's setlist
    await warmEndpoint(`${appUrl}/api/setlists/${show.id}`, results);
  }

  // Warm popular venues
  for (const venue of popularVenues || []) {
    await warmEndpoint(`${appUrl}/api/venues/${venue.slug}`, results);
    await warmEndpoint(`${appUrl}/venues/${venue.slug}`, results);
  }
}

async function warmRecentContent(supabase: any, appUrl: string, maxItems: number, results: any) {
  // Get recent shows
  const { data: recentShows } = await supabase
    .from('shows')
    .select('id, slug, show_date, artists(name)')
    .gte('show_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(Math.min(maxItems, 30));

  // Get recently added artists
  const { data: recentArtists } = await supabase
    .from('artists')
    .select('id, slug, name, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(Math.min(maxItems, 20));

  // Get recent setlists
  const { data: recentSetlists } = await supabase
    .from('setlists')
    .select('id, show_id, shows(slug)')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(Math.min(maxItems, 25));

  // Warm recent shows
  for (const show of recentShows || []) {
    await warmEndpoint(`${appUrl}/api/shows/${show.slug}`, results);
    await warmEndpoint(`${appUrl}/shows/${show.slug}`, results);
  }

  // Warm recent artists
  for (const artist of recentArtists || []) {
    await warmEndpoint(`${appUrl}/api/artists/${artist.slug}`, results);
    await warmEndpoint(`${appUrl}/artists/${artist.slug}`, results);
  }

  // Warm recent setlists
  for (const setlist of recentSetlists || []) {
    if (setlist.shows?.slug) {
      await warmEndpoint(`${appUrl}/api/setlists/${setlist.show_id}`, results);
      await warmEndpoint(`${appUrl}/shows/${setlist.shows.slug}`, results);
    }
  }
}

async function warmEndpoint(url: string, results: any) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MySetlist-CacheWarmer/1.0',
        'Accept': 'application/json, text/html',
        'Cache-Control': 'no-cache',
      },
    });

    if (response.ok) {
      results.warmed++;
      
      // For API endpoints, also warm with different parameters
      if (url.includes('/api/')) {
        // Add common query parameters
        const variations = [
          `${url}?limit=10`,
          `${url}?limit=20`,
          `${url}?includeStats=true`,
        ];

        for (const variation of variations) {
          try {
            const varResponse = await fetch(variation, {
              method: 'GET',
              headers: {
                'User-Agent': 'MySetlist-CacheWarmer/1.0',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
              },
            });
            
            if (varResponse.ok) {
              results.warmed++;
            }
          } catch (error) {
            // Ignore variations that fail
          }
        }
      }
    } else {
      results.failed++;
    }
  } catch (error) {
    results.failed++;
  }

  // Rate limiting to avoid overwhelming the server
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Schedule automatic cache warming
if (Deno.env.get('ENABLE_SCHEDULED_CACHE_WARMING') === 'true') {
  // This would be configured in Supabase Edge Functions cron
  setInterval(async () => {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const appUrl = Deno.env.get('APP_URL') || 'https://mysetlist.vercel.app';

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const results = { warmed: 0, failed: 0, duration: 0, timestamp: new Date().toISOString() };

      // Warm trending content every 5 minutes
      await warmTrendingContent(supabase, appUrl, 20, results);
      
      console.log('Scheduled cache warming completed:', results);
    } catch (error) {
      console.error('Scheduled cache warming failed:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}