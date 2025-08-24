// MySetlist-S4 EU Shows Sync Cron Job
// File: apps/web/app/api/cron/sync-eu-shows/route.ts
// Synchronizes shows in European markets during optimal hours

import { NextRequest, NextResponse } from 'next/server';
import { db, sql } from '@repo/database';
import { queueManager, QueueName, Priority } from '../../../../lib/queues/queue-manager';
import { batchApiOptimizer } from '../../../../lib/services/batch-api-optimizer';

// EU country codes and their Ticketmaster domains
const EU_COUNTRIES = {
  'GB': { domain: 'ticketmaster.co.uk', locale: 'en-gb', currency: 'GBP' },
  'DE': { domain: 'ticketmaster.de', locale: 'de-de', currency: 'EUR' },
  'FR': { domain: 'ticketmaster.fr', locale: 'fr-fr', currency: 'EUR' },
  'IT': { domain: 'ticketmaster.it', locale: 'it-it', currency: 'EUR' },
  'ES': { domain: 'ticketmaster.es', locale: 'es-es', currency: 'EUR' },
  'NL': { domain: 'ticketmaster.nl', locale: 'nl-nl', currency: 'EUR' },
  'BE': { domain: 'ticketmaster.be', locale: 'nl-be', currency: 'EUR' },
  'AT': { domain: 'ticketmaster.at', locale: 'de-at', currency: 'EUR' },
  'CH': { domain: 'ticketmaster.ch', locale: 'de-ch', currency: 'CHF' },
  'IE': { domain: 'ticketmaster.ie', locale: 'en-ie', currency: 'EUR' },
  'PT': { domain: 'ticketmaster.pt', locale: 'pt-pt', currency: 'EUR' },
  'SE': { domain: 'ticketmaster.se', locale: 'sv-se', currency: 'SEK' },
  'NO': { domain: 'ticketmaster.no', locale: 'no-no', currency: 'NOK' },
  'DK': { domain: 'ticketmaster.dk', locale: 'da-dk', currency: 'DKK' },
  'FI': { domain: 'ticketmaster.fi', locale: 'fi-fi', currency: 'EUR' },
} as const;

type EUCountryCode = keyof typeof EU_COUNTRIES;

interface EUShow {
  id: string;
  ticketmaster_id: string;
  date: string;
  last_sync_at: string | null;
  venue_id: string;
  country: EUCountryCode;
  timezone: string;
  artist_name: string;
  venue_name: string;
  city: string;
}

interface SyncResult {
  success: boolean;
  showId: string;
  country: EUCountryCode;
  error?: string;
  updated?: boolean;
  cached?: boolean;
}

function getLocaleForCountry(country: EUCountryCode): string {
  return EU_COUNTRIES[country]?.locale || 'en-gb';
}

function getDomainForCountry(country: EUCountryCode): string {
  return EU_COUNTRIES[country]?.domain || 'ticketmaster.co.uk';
}

function getCurrencyForCountry(country: EUCountryCode): string {
  return EU_COUNTRIES[country]?.currency || 'EUR';
}

async function getEUShowsToSync(): Promise<EUShow[]> {
  console.log('🔍 Querying EU shows that need syncing...');
  
  const result = await db.execute(sql`
    SELECT 
      s.id,
      s.ticketmaster_id,
      s.date,
      s.last_sync_at,
      s.venue_id,
      v.country,
      v.timezone,
      a.name as artist_name,
      v.name as venue_name,
      v.city
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    JOIN artists a ON s.artist_id = a.id
    WHERE v.country IN ('GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'IE', 'PT', 'SE', 'NO', 'DK', 'FI')
    AND s.date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    AND (s.last_sync_at IS NULL OR s.last_sync_at < NOW() - INTERVAL '12 hours')
    AND s.ticketmaster_id IS NOT NULL
    AND s.ticketmaster_id != ''
    ORDER BY 
      CASE 
        WHEN s.last_sync_at IS NULL THEN 0
        ELSE 1
      END,
      s.date ASC
    LIMIT 100
  `);

  const shows = result.rows as EUShow[];
  console.log(`📊 Found ${shows.length} EU shows to sync`);
  
  // Log country distribution
  const countryStats = shows.reduce((acc, show) => {
    acc[show.country] = (acc[show.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('🌍 Country distribution:', countryStats);
  
  return shows;
}

async function syncShowWithTicketmaster(show: EUShow): Promise<SyncResult> {
  try {
    const domain = getDomainForCountry(show.country);
    const locale = getLocaleForCountry(show.country);
    const currency = getCurrencyForCountry(show.country);
    
    console.log(`🎫 Syncing show ${show.id} (${show.country}) - ${show.artist_name} at ${show.venue_name}`);
    
    // Use batch API optimizer for efficient API calls
    const eventData = await batchApiOptimizer.request('ticketmaster', 'getEvent', {
      id: show.ticketmaster_id,
      locale,
      domain,
      currency,
      includeTicketInfo: true,
      includePricing: true,
    }, { 
      priority: 8,
      cacheKey: `tm-event-${show.ticketmaster_id}-${locale}`
    });

    // Update show data in database
    const updateResult = await db.execute(sql`
      UPDATE shows SET
        last_sync_at = NOW(),
        ticket_status = ${eventData.ticketStatus || 'unknown'},
        price_min = ${eventData.priceRanges?.[0]?.min || null},
        price_max = ${eventData.priceRanges?.[0]?.max || null},
        currency = ${currency},
        sales_start_date = ${eventData.sales?.public?.startDateTime || null},
        sales_end_date = ${eventData.sales?.public?.endDateTime || null},
        presale_start_date = ${eventData.sales?.presales?.[0]?.startDateTime || null},
        presale_end_date = ${eventData.sales?.presales?.[0]?.endDateTime || null},
        updated_at = NOW()
      WHERE id = ${show.id}
    `);

    // Log sync to database
    await db.execute(sql`
      INSERT INTO sync_logs (
        entity_type,
        entity_id,
        sync_type,
        status,
        details,
        created_at
      ) VALUES (
        'show',
        ${show.id},
        'eu-cron-sync',
        'success',
        ${JSON.stringify({
          country: show.country,
          domain,
          locale,
          currency,
          ticketStatus: eventData.ticketStatus,
          priceRange: eventData.priceRanges?.[0],
        })},
        NOW()
      )
    `);

    return {
      success: true,
      showId: show.id,
      country: show.country,
      updated: updateResult.rowsAffected > 0,
      cached: eventData._cached || false,
    };

  } catch (error) {
    console.error(`❌ Failed to sync show ${show.id}:`, error);
    
    // Log error to database
    await db.execute(sql`
      INSERT INTO sync_logs (
        entity_type,
        entity_id,
        sync_type,
        status,
        details,
        created_at
      ) VALUES (
        'show',
        ${show.id},
        'eu-cron-sync',
        'error',
        ${JSON.stringify({
          country: show.country,
          error: error instanceof Error ? error.message : String(error),
        })},
        NOW()
      )
    `);

    return {
      success: false,
      showId: show.id,
      country: show.country,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function processEUShowsInBatches(shows: EUShow[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const batchSize = 10; // Process 10 shows at a time
  
  console.log(`🔄 Processing ${shows.length} shows in batches of ${batchSize}`);
  
  for (let i = 0; i < shows.length; i += batchSize) {
    const batch = shows.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(shows.length / batchSize)}`);
    
    // Process batch in parallel
    const batchPromises = batch.map(show => syncShowWithTicketmaster(show));
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Collect results
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          showId: batch[j].id,
          country: batch[j].country,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < shows.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

async function addQueueJobs(shows: EUShow[]): Promise<void> {
  if (shows.length === 0) return;
  
  console.log('📋 Adding EU shows to sync queue...');
  
  // Group shows by country for efficient processing
  const showsByCountry = shows.reduce((acc, show) => {
    if (!acc[show.country]) {
      acc[show.country] = [];
    }
    acc[show.country].push(show.id);
    return acc;
  }, {} as Record<EUCountryCode, string[]>);
  
  // Add queue jobs for each country
  for (const [country, showIds] of Object.entries(showsByCountry)) {
    await queueManager.addJob(
      QueueName.TICKETMASTER_SYNC,
      'sync-eu-shows',
      {
        showIds,
        region: 'EU',
        country,
        domain: getDomainForCountry(country as EUCountryCode),
        locale: getLocaleForCountry(country as EUCountryCode),
        currency: getCurrencyForCountry(country as EUCountryCode),
      },
      { 
        priority: Priority.HIGH,
        delay: Math.random() * 30000, // Random delay up to 30 seconds
      }
    );
  }
  
  console.log(`✅ Added ${Object.keys(showsByCountry).length} country-specific sync jobs to queue`);
}

async function logCronRun(status: 'success' | 'error', details: any): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO cron_logs (
        job_name,
        status,
        details,
        run_at
      ) VALUES (
        'sync-eu-shows',
        ${status},
        ${JSON.stringify(details)},
        NOW()
      )
    `);
  } catch (error) {
    console.error('Failed to log cron run:', error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🇪🇺 Starting EU Shows Sync Cron Job...');
  
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Invalid cron secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if it's optimal EU hours (1-4 AM UTC = 2-5 AM CET)
    const currentHour = new Date().getUTCHours();
    const isOptimalTime = currentHour >= 1 && currentHour <= 4;
    
    if (!isOptimalTime) {
      console.log(`⏰ Not optimal EU sync time (${currentHour}:00 UTC). Running anyway for cron trigger.`);
    }
    
    // Initialize queue manager
    await queueManager.initialize();
    
    // Get EU shows that need syncing
    const shows = await getEUShowsToSync();
    
    if (shows.length === 0) {
      const result = {
        success: true,
        message: 'No EU shows need syncing',
        processed: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
      
      await logCronRun('success', result);
      
      return NextResponse.json(result);
    }
    
    // Process shows in batches
    const syncResults = await processEUShowsInBatches(shows);
    
    // Add remaining shows to queue for background processing
    const failedShows = shows.filter((_, index) => !syncResults[index]?.success);
    if (failedShows.length > 0) {
      await addQueueJobs(failedShows);
    }
    
    // Calculate statistics
    const stats = {
      total: shows.length,
      successful: syncResults.filter(r => r.success).length,
      failed: syncResults.filter(r => !r.success).length,
      cached: syncResults.filter(r => r.cached).length,
      updated: syncResults.filter(r => r.updated).length,
      queuedForRetry: failedShows.length,
    };
    
    // Country-specific stats
    const countryStats = syncResults.reduce((acc, result) => {
      if (!acc[result.country]) {
        acc[result.country] = { success: 0, failed: 0 };
      }
      if (result.success) {
        acc[result.country].success++;
      } else {
        acc[result.country].failed++;
      }
      return acc;
    }, {} as Record<string, { success: number; failed: number }>);
    
    const result = {
      success: true,
      message: `Processed ${stats.total} EU shows`,
      stats,
      countryStats,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      optimalTime: isOptimalTime,
    };
    
    console.log('✅ EU Shows Sync completed:', result);
    
    await logCronRun('success', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ EU Shows Sync failed:', error);
    
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
    
    await logCronRun('error', errorResult);
    
    return NextResponse.json(errorResult, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);
    
    // Check queue manager health
    const queueHealth = await queueManager.getHealthStatus();
    
    // Get recent sync stats
    const recentSyncs = await db.execute(sql`
      SELECT 
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
        MAX(run_at) as last_run
      FROM cron_logs 
      WHERE job_name = 'sync-eu-shows' 
      AND run_at > NOW() - INTERVAL '24 hours'
    `);
    
    const stats = recentSyncs.rows[0] || { total_runs: 0, successful_runs: 0, last_run: null };
    
    return NextResponse.json({
      healthy: true,
      service: 'sync-eu-shows',
      database: true,
      queueManager: queueHealth.healthy,
      last24Hours: {
        totalRuns: Number(stats.total_runs),
        successfulRuns: Number(stats.successful_runs),
        lastRun: stats.last_run,
      },
      supportedCountries: Object.keys(EU_COUNTRIES),
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    return NextResponse.json({
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}