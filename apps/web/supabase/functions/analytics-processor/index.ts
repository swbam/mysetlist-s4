import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
}

interface ProcessingRequest {
  events: AnalyticsEvent[];
  batchId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { events, batchId } = (await req.json()) as ProcessingRequest;

    const results = {
      processed: 0,
      failed: 0,
      insights: {} as Record<string, any>,
      batchId: batchId || crypto.randomUUID(),
    };

    // Process each event
    for (const event of events) {
      try {
        await processAnalyticsEvent(supabase, event);
        results.processed++;
      } catch (error) {
        console.error('Failed to process event:', error);
        results.failed++;
      }
    }

    // Generate insights from processed events
    results.insights = await generateInsights(supabase, events);

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

async function processAnalyticsEvent(supabase: any, event: AnalyticsEvent) {
  // Store raw event
  await supabase.from('analytics_events').insert({
    event_name: event.event,
    properties: event.properties,
    user_id: event.userId,
    session_id: event.sessionId,
    ip_address: event.ip,
    user_agent: event.userAgent,
    url: event.url,
    created_at: event.timestamp,
  });

  // Process specific event types
  switch (event.event) {
    case 'page_view':
      await processPageView(supabase, event);
      break;
    case 'artist_view':
      await processArtistView(supabase, event);
      break;
    case 'show_view':
      await processShowView(supabase, event);
      break;
    case 'search_performed':
      await processSearch(supabase, event);
      break;
    case 'vote_cast':
      await processVote(supabase, event);
      break;
    case 'user_signup':
      await processUserSignup(supabase, event);
      break;
    case 'user_login':
      await processUserLogin(supabase, event);
      break;
    default:
      // Store in general analytics table
      await supabase.from('analytics_metrics').insert({
        metric_name: event.event,
        metric_value: 1,
        dimensions: event.properties,
        timestamp: event.timestamp,
      });
  }
}

async function processPageView(supabase: any, event: AnalyticsEvent) {
  const { path, referrer, device } = event.properties;

  // Update page view counts
  await supabase.from('analytics_page_views').insert({
    path,
    referrer,
    device_type: device?.type || 'unknown',
    user_id: event.userId,
    session_id: event.sessionId,
    created_at: event.timestamp,
  });

  // Update daily aggregates
  const today = new Date(event.timestamp).toISOString().split('T')[0];
  await supabase
    .from('analytics_daily_stats')
    .upsert({
      date: today,
      metric_name: 'page_views',
      metric_value: 1,
      dimensions: { path },
    }, {
      onConflict: 'date,metric_name,dimensions',
      ignoreDuplicates: false,
    });
}

async function processArtistView(supabase: any, event: AnalyticsEvent) {
  const { artistId, artistName, source } = event.properties;

  // Update artist view count
  await supabase
    .from('artists')
    .update({
      view_count: supabase.raw('view_count + 1'),
      last_viewed: event.timestamp,
    })
    .eq('id', artistId);

  // Track artist popularity
  await supabase.from('analytics_artist_views').insert({
    artist_id: artistId,
    user_id: event.userId,
    source,
    created_at: event.timestamp,
  });

  // Update trending score
  await updateTrendingScore(supabase, 'artist', artistId);
}

async function processShowView(supabase: any, event: AnalyticsEvent) {
  const { showId, artistId, venue } = event.properties;

  // Update show view count
  await supabase
    .from('shows')
    .update({
      view_count: supabase.raw('view_count + 1'),
      last_viewed: event.timestamp,
    })
    .eq('id', showId);

  // Track show popularity
  await supabase.from('analytics_show_views').insert({
    show_id: showId,
    artist_id: artistId,
    user_id: event.userId,
    created_at: event.timestamp,
  });

  // Update trending score
  await updateTrendingScore(supabase, 'show', showId);
}

async function processSearch(supabase: any, event: AnalyticsEvent) {
  const { query, type, results_count } = event.properties;

  // Store search query
  await supabase.from('analytics_searches').insert({
    query,
    search_type: type,
    results_count,
    user_id: event.userId,
    created_at: event.timestamp,
  });

  // Update popular searches
  await supabase
    .from('analytics_popular_searches')
    .upsert({
      query: query.toLowerCase(),
      search_type: type,
      search_count: 1,
      last_searched: event.timestamp,
    }, {
      onConflict: 'query,search_type',
      ignoreDuplicates: false,
    });
}

async function processVote(supabase: any, event: AnalyticsEvent) {
  const { setlistSongId, voteType, artistId, showId } = event.properties;

  // Update vote analytics
  await supabase.from('analytics_votes').insert({
    setlist_song_id: setlistSongId,
    vote_type: voteType,
    artist_id: artistId,
    show_id: showId,
    user_id: event.userId,
    created_at: event.timestamp,
  });

  // Update artist engagement
  await supabase
    .from('artists')
    .update({
      engagement_score: supabase.raw('engagement_score + 1'),
    })
    .eq('id', artistId);
}

async function processUserSignup(supabase: any, event: AnalyticsEvent) {
  const { method, referrer } = event.properties;

  await supabase.from('analytics_user_signups').insert({
    user_id: event.userId,
    signup_method: method,
    referrer,
    created_at: event.timestamp,
  });

  // Update daily signup stats
  const today = new Date(event.timestamp).toISOString().split('T')[0];
  await supabase
    .from('analytics_daily_stats')
    .upsert({
      date: today,
      metric_name: 'user_signups',
      metric_value: 1,
      dimensions: { method },
    }, {
      onConflict: 'date,metric_name,dimensions',
    });
}

async function processUserLogin(supabase: any, event: AnalyticsEvent) {
  const { method, isFirstTime } = event.properties;

  await supabase.from('analytics_user_logins').insert({
    user_id: event.userId,
    login_method: method,
    is_first_time: isFirstTime,
    created_at: event.timestamp,
  });

  // Update user activity
  await supabase
    .from('users')
    .update({
      last_login: event.timestamp,
      login_count: supabase.raw('login_count + 1'),
    })
    .eq('id', event.userId);
}

async function updateTrendingScore(supabase: any, entityType: 'artist' | 'show', entityId: string) {
  const table = entityType === 'artist' ? 'artists' : 'shows';
  const now = new Date();
  const hourWeight = 1 / (1 + Math.floor((now.getTime() - Date.now()) / (1000 * 60 * 60)));
  
  await supabase
    .from(table)
    .update({
      trending_score: supabase.raw(`trending_score + ${hourWeight}`),
    })
    .eq('id', entityId);
}

async function generateInsights(supabase: any, events: AnalyticsEvent[]) {
  const insights = {
    topEvents: {} as Record<string, number>,
    uniqueUsers: new Set<string>(),
    deviceTypes: {} as Record<string, number>,
    topPages: {} as Record<string, number>,
    conversionFunnel: {
      page_views: 0,
      artist_views: 0,
      show_views: 0,
      votes: 0,
      signups: 0,
    },
  };

  // Process events for insights
  for (const event of events) {
    insights.topEvents[event.event] = (insights.topEvents[event.event] || 0) + 1;
    
    if (event.userId) {
      insights.uniqueUsers.add(event.userId);
    }

    if (event.properties.device?.type) {
      insights.deviceTypes[event.properties.device.type] = 
        (insights.deviceTypes[event.properties.device.type] || 0) + 1;
    }

    if (event.event === 'page_view' && event.properties.path) {
      insights.topPages[event.properties.path] = 
        (insights.topPages[event.properties.path] || 0) + 1;
    }

    // Update conversion funnel
    if (event.event in insights.conversionFunnel) {
      insights.conversionFunnel[event.event as keyof typeof insights.conversionFunnel]++;
    }
  }

  return {
    ...insights,
    uniqueUsers: insights.uniqueUsers.size,
    totalEvents: events.length,
    processingTime: new Date().toISOString(),
  };
}