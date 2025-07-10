import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ActivityEvent {
  userId: string;
  action: 'page_view' | 'search' | 'vote' | 'follow' | 'share' | 'login' | 'signup';
  metadata: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

interface TrackingRequest {
  events: ActivityEvent[];
  sessionId?: string;
  analyzePatterns?: boolean;
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
    const { events, sessionId, analyzePatterns = false } = (await req.json()) as TrackingRequest;

    const results = {
      processed: 0,
      failed: 0,
      patterns: {} as Record<string, any>,
      insights: {} as Record<string, any>,
      timestamp: new Date().toISOString(),
    };

    // Process each activity event
    for (const event of events) {
      try {
        await processActivityEvent(supabase, event);
        results.processed++;
      } catch (error) {
        console.error('Failed to process activity event:', error);
        results.failed++;
      }
    }

    // Analyze patterns if requested
    if (analyzePatterns) {
      results.patterns = await analyzeUserPatterns(supabase, events);
      results.insights = await generateUserInsights(supabase, events);
    }

    // Update user activity summary
    await updateUserActivitySummary(supabase, events);

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

async function processActivityEvent(supabase: any, event: ActivityEvent) {
  // Store the raw activity event
  await supabase.from('user_activities').insert({
    user_id: event.userId,
    action: event.action,
    metadata: event.metadata,
    session_id: event.sessionId,
    ip_address: event.ip,
    user_agent: event.userAgent,
    created_at: event.timestamp,
  });

  // Process specific activity types
  switch (event.action) {
    case 'page_view':
      await processPageViewActivity(supabase, event);
      break;
    case 'search':
      await processSearchActivity(supabase, event);
      break;
    case 'vote':
      await processVoteActivity(supabase, event);
      break;
    case 'follow':
      await processFollowActivity(supabase, event);
      break;
    case 'share':
      await processShareActivity(supabase, event);
      break;
    case 'login':
      await processLoginActivity(supabase, event);
      break;
    case 'signup':
      await processSignupActivity(supabase, event);
      break;
  }

  // Update user engagement metrics
  await updateUserEngagement(supabase, event);
}

async function processPageViewActivity(supabase: any, event: ActivityEvent) {
  const { path, referrer, duration } = event.metadata;

  // Track page popularity
  await supabase
    .from('page_popularity')
    .upsert({
      path,
      view_count: 1,
      unique_visitors: 1,
      total_duration: duration || 0,
      last_viewed: event.timestamp,
    }, {
      onConflict: 'path',
      ignoreDuplicates: false,
    });

  // Track user journey
  await supabase.from('user_journey').insert({
    user_id: event.userId,
    session_id: event.sessionId,
    path,
    referrer,
    duration: duration || 0,
    created_at: event.timestamp,
  });

  // Update user's browsing pattern
  await updateBrowsingPattern(supabase, event.userId, path);
}

async function processSearchActivity(supabase: any, event: ActivityEvent) {
  const { query, type, results_count } = event.metadata;

  // Track search patterns
  await supabase.from('user_search_patterns').insert({
    user_id: event.userId,
    query,
    search_type: type,
    results_count,
    created_at: event.timestamp,
  });

  // Update popular searches
  await supabase
    .from('popular_searches')
    .upsert({
      query: query.toLowerCase(),
      search_type: type,
      search_count: 1,
      last_searched: event.timestamp,
    }, {
      onConflict: 'query,search_type',
      ignoreDuplicates: false,
    });

  // Track user interests based on search
  await trackUserInterests(supabase, event.userId, query, type);
}

async function processVoteActivity(supabase: any, event: ActivityEvent) {
  const { setlistSongId, voteType, artistId, showId } = event.metadata;

  // Track voting patterns
  await supabase.from('user_voting_patterns').insert({
    user_id: event.userId,
    setlist_song_id: setlistSongId,
    vote_type: voteType,
    artist_id: artistId,
    show_id: showId,
    created_at: event.timestamp,
  });

  // Update user's music preferences
  await updateMusicPreferences(supabase, event.userId, artistId, voteType);
}

async function processFollowActivity(supabase: any, event: ActivityEvent) {
  const { artistId, action } = event.metadata; // action: 'follow' or 'unfollow'

  // Track follow patterns
  await supabase.from('user_follow_patterns').insert({
    user_id: event.userId,
    artist_id: artistId,
    action,
    created_at: event.timestamp,
  });

  // Update user's artist preferences
  if (action === 'follow') {
    await updateArtistPreferences(supabase, event.userId, artistId);
  }
}

async function processShareActivity(supabase: any, event: ActivityEvent) {
  const { contentType, contentId, platform } = event.metadata;

  // Track sharing patterns
  await supabase.from('user_sharing_patterns').insert({
    user_id: event.userId,
    content_type: contentType,
    content_id: contentId,
    platform,
    created_at: event.timestamp,
  });

  // Update content virality metrics
  await updateContentVirality(supabase, contentType, contentId);
}

async function processLoginActivity(supabase: any, event: ActivityEvent) {
  const { method, device, location } = event.metadata;

  // Track login patterns
  await supabase.from('user_login_patterns').insert({
    user_id: event.userId,
    login_method: method,
    device_type: device?.type,
    location,
    created_at: event.timestamp,
  });

  // Update user's last activity
  await supabase
    .from('users')
    .update({
      last_login: event.timestamp,
      login_count: supabase.raw('login_count + 1'),
    })
    .eq('id', event.userId);
}

async function processSignupActivity(supabase: any, event: ActivityEvent) {
  const { method, referrer, source } = event.metadata;

  // Track signup patterns
  await supabase.from('user_signup_patterns').insert({
    user_id: event.userId,
    signup_method: method,
    referrer,
    source,
    created_at: event.timestamp,
  });

  // Initialize user preferences
  await initializeUserPreferences(supabase, event.userId);
}

async function updateUserEngagement(supabase: any, event: ActivityEvent) {
  const engagementScores = {
    page_view: 1,
    search: 2,
    vote: 5,
    follow: 3,
    share: 4,
    login: 1,
    signup: 10,
  };

  const score = engagementScores[event.action] || 1;

  await supabase
    .from('user_engagement')
    .upsert({
      user_id: event.userId,
      engagement_score: score,
      activity_count: 1,
      last_activity: event.timestamp,
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    });
}

async function updateBrowsingPattern(supabase: any, userId: string, path: string) {
  // Extract content type from path
  let contentType = 'unknown';
  if (path.includes('/artists/')) contentType = 'artist';
  else if (path.includes('/shows/')) contentType = 'show';
  else if (path.includes('/venues/')) contentType = 'venue';
  else if (path === '/') contentType = 'homepage';
  else if (path.includes('/search')) contentType = 'search';

  await supabase
    .from('user_browsing_patterns')
    .upsert({
      user_id: userId,
      content_type: contentType,
      view_count: 1,
      last_viewed: new Date().toISOString(),
    }, {
      onConflict: 'user_id,content_type',
      ignoreDuplicates: false,
    });
}

async function trackUserInterests(supabase: any, userId: string, query: string, type: string) {
  // Extract interests from search query
  const interests = query.toLowerCase().split(' ').filter(word => word.length > 2);

  for (const interest of interests) {
    await supabase
      .from('user_interests')
      .upsert({
        user_id: userId,
        interest,
        interest_type: type,
        strength: 1,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id,interest',
        ignoreDuplicates: false,
      });
  }
}

async function updateMusicPreferences(supabase: any, userId: string, artistId: string, voteType: string) {
  const preferenceScore = voteType === 'upvote' ? 2 : -1;

  // Get artist genres
  const { data: artist } = await supabase
    .from('artists')
    .select('genres')
    .eq('id', artistId)
    .single();

  if (artist && artist.genres) {
    const genres = typeof artist.genres === 'string' ? JSON.parse(artist.genres) : artist.genres;
    
    for (const genre of genres) {
      await supabase
        .from('user_music_preferences')
        .upsert({
          user_id: userId,
          preference_type: 'genre',
          preference_value: genre,
          score: preferenceScore,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id,preference_type,preference_value',
          ignoreDuplicates: false,
        });
    }
  }

  // Update artist preference
  await supabase
    .from('user_music_preferences')
    .upsert({
      user_id: userId,
      preference_type: 'artist',
      preference_value: artistId,
      score: preferenceScore,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'user_id,preference_type,preference_value',
      ignoreDuplicates: false,
    });
}

async function updateArtistPreferences(supabase: any, userId: string, artistId: string) {
  await supabase
    .from('user_music_preferences')
    .upsert({
      user_id: userId,
      preference_type: 'artist',
      preference_value: artistId,
      score: 5, // Following is a strong preference signal
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'user_id,preference_type,preference_value',
      ignoreDuplicates: false,
    });
}

async function updateContentVirality(supabase: any, contentType: string, contentId: string) {
  const table = contentType === 'artist' ? 'artists' : 
                contentType === 'show' ? 'shows' : 
                contentType === 'venue' ? 'venues' : null;

  if (table) {
    await supabase
      .from(table)
      .update({
        share_count: supabase.raw('share_count + 1'),
        virality_score: supabase.raw('virality_score + 1'),
      })
      .eq('id', contentId);
  }
}

async function initializeUserPreferences(supabase: any, userId: string) {
  // Initialize default preferences
  await supabase.from('user_preferences').insert({
    user_id: userId,
    email_notifications: true,
    push_notifications: true,
    privacy_level: 'public',
    created_at: new Date().toISOString(),
  });
}

async function updateUserActivitySummary(supabase: any, events: ActivityEvent[]) {
  const userSummaries = {} as Record<string, any>;

  for (const event of events) {
    if (!userSummaries[event.userId]) {
      userSummaries[event.userId] = {
        user_id: event.userId,
        total_activities: 0,
        last_activity: event.timestamp,
        activity_types: {} as Record<string, number>,
      };
    }

    userSummaries[event.userId].total_activities++;
    userSummaries[event.userId].activity_types[event.action] = 
      (userSummaries[event.userId].activity_types[event.action] || 0) + 1;
    
    if (new Date(event.timestamp) > new Date(userSummaries[event.userId].last_activity)) {
      userSummaries[event.userId].last_activity = event.timestamp;
    }
  }

  // Update user activity summaries
  for (const summary of Object.values(userSummaries)) {
    await supabase
      .from('user_activity_summary')
      .upsert(summary, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });
  }
}

async function analyzeUserPatterns(supabase: any, events: ActivityEvent[]) {
  const patterns = {
    mostActiveUsers: {} as Record<string, number>,
    popularActions: {} as Record<string, number>,
    timeDistribution: {} as Record<string, number>,
    sessionLengths: [] as number[],
  };

  for (const event of events) {
    // Count user activities
    patterns.mostActiveUsers[event.userId] = 
      (patterns.mostActiveUsers[event.userId] || 0) + 1;

    // Count action types
    patterns.popularActions[event.action] = 
      (patterns.popularActions[event.action] || 0) + 1;

    // Analyze time distribution
    const hour = new Date(event.timestamp).getHours();
    patterns.timeDistribution[hour] = 
      (patterns.timeDistribution[hour] || 0) + 1;
  }

  return patterns;
}

async function generateUserInsights(supabase: any, events: ActivityEvent[]) {
  const insights = {
    totalUsers: new Set(events.map(e => e.userId)).size,
    totalEvents: events.length,
    averageEventsPerUser: 0,
    topActions: [] as Array<{action: string, count: number}>,
    peakHours: [] as Array<{hour: number, count: number}>,
  };

  insights.averageEventsPerUser = insights.totalEvents / insights.totalUsers;

  // Get top actions
  const actionCounts = {} as Record<string, number>;
  for (const event of events) {
    actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
  }

  insights.topActions = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([action, count]) => ({ action, count }));

  // Get peak hours
  const hourCounts = {} as Record<number, number>;
  for (const event of events) {
    const hour = new Date(event.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  insights.peakHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));

  return insights;
}