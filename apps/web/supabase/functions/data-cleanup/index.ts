import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  type: 'logs' | 'analytics' | 'sessions' | 'temp_data' | 'all';
  retentionDays?: number;
  dryRun?: boolean;
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
    const { type, retentionDays = 30, dryRun = false } = (await req.json()) as CleanupRequest;

    const results = {
      type,
      retentionDays,
      dryRun,
      cleaned: {} as Record<string, number>,
      errors: [] as string[],
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    const startTime = Date.now();

    switch (type) {
      case 'logs':
        await cleanupLogs(supabase, retentionDays, dryRun, results);
        break;
      case 'analytics':
        await cleanupAnalytics(supabase, retentionDays, dryRun, results);
        break;
      case 'sessions':
        await cleanupSessions(supabase, retentionDays, dryRun, results);
        break;
      case 'temp_data':
        await cleanupTempData(supabase, retentionDays, dryRun, results);
        break;
      case 'all':
        await cleanupLogs(supabase, retentionDays, dryRun, results);
        await cleanupAnalytics(supabase, retentionDays, dryRun, results);
        await cleanupSessions(supabase, retentionDays, dryRun, results);
        await cleanupTempData(supabase, retentionDays, dryRun, results);
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

async function cleanupLogs(supabase: any, retentionDays: number, dryRun: boolean, results: any) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const cutoffDateString = cutoffDate.toISOString();

  try {
    // Clean up error logs (keep for 90 days)
    const errorRetentionDays = Math.max(retentionDays, 90);
    const errorCutoffDate = new Date(Date.now() - errorRetentionDays * 24 * 60 * 60 * 1000).toISOString();
    
    if (dryRun) {
      const { count: errorLogsCount } = await supabase
        .from('error_logs')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', errorCutoffDate);
      
      results.cleaned.error_logs = errorLogsCount || 0;
    } else {
      const { error: errorLogsError } = await supabase
        .from('error_logs')
        .delete()
        .lt('created_at', errorCutoffDate);
      
      if (errorLogsError) {
        results.errors.push(`Error cleaning error logs: ${errorLogsError.message}`);
      }
    }

    // Clean up access logs (keep for 30 days)
    if (dryRun) {
      const { count: accessLogsCount } = await supabase
        .from('access_logs')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', cutoffDateString);
      
      results.cleaned.access_logs = accessLogsCount || 0;
    } else {
      const { error: accessLogsError } = await supabase
        .from('access_logs')
        .delete()
        .lt('created_at', cutoffDateString);
      
      if (accessLogsError) {
        results.errors.push(`Error cleaning access logs: ${accessLogsError.message}`);
      }
    }

    // Clean up performance logs (keep for 14 days)
    const performanceCutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    if (dryRun) {
      const { count: performanceLogsCount } = await supabase
        .from('performance_logs')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', performanceCutoffDate);
      
      results.cleaned.performance_logs = performanceLogsCount || 0;
    } else {
      const { error: performanceLogsError } = await supabase
        .from('performance_logs')
        .delete()
        .lt('created_at', performanceCutoffDate);
      
      if (performanceLogsError) {
        results.errors.push(`Error cleaning performance logs: ${performanceLogsError.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error in cleanup logs: ${error.message}`);
  }
}

async function cleanupAnalytics(supabase: any, retentionDays: number, dryRun: boolean, results: any) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const cutoffDateString = cutoffDate.toISOString();

  try {
    // Clean up raw analytics events (keep for 30 days, aggregate into daily stats)
    const rawAnalyticsCutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    if (dryRun) {
      const { count: analyticsEventsCount } = await supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', rawAnalyticsCutoffDate);
      
      results.cleaned.analytics_events = analyticsEventsCount || 0;
    } else {
      // First, aggregate into daily stats before deleting
      await aggregateAnalyticsBeforeCleanup(supabase, rawAnalyticsCutoffDate);
      
      const { error: analyticsError } = await supabase
        .from('analytics_events')
        .delete()
        .lt('created_at', rawAnalyticsCutoffDate);
      
      if (analyticsError) {
        results.errors.push(`Error cleaning analytics events: ${analyticsError.message}`);
      }
    }

    // Clean up user sessions (keep for 90 days)
    const sessionsCutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    if (dryRun) {
      const { count: sessionsCount } = await supabase
        .from('user_sessions')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', sessionsCutoffDate);
      
      results.cleaned.user_sessions = sessionsCount || 0;
    } else {
      const { error: sessionsError } = await supabase
        .from('user_sessions')
        .delete()
        .lt('created_at', sessionsCutoffDate);
      
      if (sessionsError) {
        results.errors.push(`Error cleaning user sessions: ${sessionsError.message}`);
      }
    }

    // Clean up old page views (keep for 60 days)
    const pageViewsCutoffDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    
    if (dryRun) {
      const { count: pageViewsCount } = await supabase
        .from('analytics_page_views')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', pageViewsCutoffDate);
      
      results.cleaned.page_views = pageViewsCount || 0;
    } else {
      const { error: pageViewsError } = await supabase
        .from('analytics_page_views')
        .delete()
        .lt('created_at', pageViewsCutoffDate);
      
      if (pageViewsError) {
        results.errors.push(`Error cleaning page views: ${pageViewsError.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error in cleanup analytics: ${error.message}`);
  }
}

async function cleanupSessions(supabase: any, retentionDays: number, dryRun: boolean, results: any) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const cutoffDateString = cutoffDate.toISOString();

  try {
    // Clean up expired sessions
    if (dryRun) {
      const { count: expiredSessionsCount } = await supabase
        .from('auth.sessions')
        .select('id', { count: 'exact', head: true })
        .lt('expires_at', cutoffDateString);
      
      results.cleaned.expired_sessions = expiredSessionsCount || 0;
    } else {
      const { error: expiredSessionsError } = await supabase
        .from('auth.sessions')
        .delete()
        .lt('expires_at', cutoffDateString);
      
      if (expiredSessionsError) {
        results.errors.push(`Error cleaning expired sessions: ${expiredSessionsError.message}`);
      }
    }

    // Clean up old refresh tokens
    if (dryRun) {
      const { count: refreshTokensCount } = await supabase
        .from('auth.refresh_tokens')
        .select('id', { count: 'exact', head: true })
        .lt('updated_at', cutoffDateString);
      
      results.cleaned.refresh_tokens = refreshTokensCount || 0;
    } else {
      const { error: refreshTokensError } = await supabase
        .from('auth.refresh_tokens')
        .delete()
        .lt('updated_at', cutoffDateString);
      
      if (refreshTokensError) {
        results.errors.push(`Error cleaning refresh tokens: ${refreshTokensError.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error in cleanup sessions: ${error.message}`);
  }
}

async function cleanupTempData(supabase: any, retentionDays: number, dryRun: boolean, results: any) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const cutoffDateString = cutoffDate.toISOString();

  try {
    // Clean up temporary uploads
    if (dryRun) {
      const { count: tempUploadsCount } = await supabase
        .from('temp_uploads')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', cutoffDateString);
      
      results.cleaned.temp_uploads = tempUploadsCount || 0;
    } else {
      const { error: tempUploadsError } = await supabase
        .from('temp_uploads')
        .delete()
        .lt('created_at', cutoffDateString);
      
      if (tempUploadsError) {
        results.errors.push(`Error cleaning temp uploads: ${tempUploadsError.message}`);
      }
    }

    // Clean up cache entries
    if (dryRun) {
      const { count: cacheEntriesCount } = await supabase
        .from('cache_entries')
        .select('id', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());
      
      results.cleaned.cache_entries = cacheEntriesCount || 0;
    } else {
      const { error: cacheEntriesError } = await supabase
        .from('cache_entries')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (cacheEntriesError) {
        results.errors.push(`Error cleaning cache entries: ${cacheEntriesError.message}`);
      }
    }

    // Clean up old sync progress records
    const syncProgressCutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    if (dryRun) {
      const { count: syncProgressCount } = await supabase
        .from('sync_progress')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', syncProgressCutoffDate);
      
      results.cleaned.sync_progress = syncProgressCount || 0;
    } else {
      const { error: syncProgressError } = await supabase
        .from('sync_progress')
        .delete()
        .lt('created_at', syncProgressCutoffDate);
      
      if (syncProgressError) {
        results.errors.push(`Error cleaning sync progress: ${syncProgressError.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error in cleanup temp data: ${error.message}`);
  }
}

async function aggregateAnalyticsBeforeCleanup(supabase: any, cutoffDate: string) {
  try {
    // Aggregate page views by day
    const { data: pageViews } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event_name', 'page_view')
      .lt('created_at', cutoffDate);

    if (pageViews && pageViews.length > 0) {
      const dailyStats = {} as Record<string, Record<string, number>>;
      
      for (const event of pageViews) {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        const path = event.properties?.path || 'unknown';
        
        if (!dailyStats[date]) {
          dailyStats[date] = {};
        }
        
        dailyStats[date][path] = (dailyStats[date][path] || 0) + 1;
      }

      // Insert aggregated stats
      for (const [date, pathStats] of Object.entries(dailyStats)) {
        for (const [path, count] of Object.entries(pathStats)) {
          await supabase
            .from('analytics_daily_stats')
            .upsert({
              date,
              metric_name: 'page_views',
              metric_value: count,
              dimensions: { path },
            }, {
              onConflict: 'date,metric_name,dimensions',
            });
        }
      }
    }

    // Aggregate other events similarly
    const eventTypes = ['artist_view', 'show_view', 'search_performed', 'vote_cast'];
    
    for (const eventType of eventTypes) {
      const { data: events } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_name', eventType)
        .lt('created_at', cutoffDate);

      if (events && events.length > 0) {
        const dailyStats = {} as Record<string, number>;
        
        for (const event of events) {
          const date = new Date(event.created_at).toISOString().split('T')[0];
          dailyStats[date] = (dailyStats[date] || 0) + 1;
        }

        for (const [date, count] of Object.entries(dailyStats)) {
          await supabase
            .from('analytics_daily_stats')
            .upsert({
              date,
              metric_name: eventType,
              metric_value: count,
              dimensions: {},
            }, {
              onConflict: 'date,metric_name,dimensions',
            });
        }
      }
    }

  } catch (error) {
    console.error('Error aggregating analytics:', error);
  }
}