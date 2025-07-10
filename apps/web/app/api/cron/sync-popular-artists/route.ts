import { db } from '@repo/database';
import { artists } from '@repo/database';
import { desc, isNull, lte, or, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Cron job to sync popular artists data
 * Runs daily to keep artist catalogs, shows, and setlists up to date
 */
export async function GET(_request: NextRequest) {
  // Verify cron secret
  const headersList = await headers();
  const cronSecret = headersList.get('x-cron-secret');

  if (process.env['CRON_SECRET'] && cronSecret !== process.env['CRON_SECRET']) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const results = {
      processed: 0,
      synced: 0,
      errors: 0,
      details: [] as any[],
    };

    // Get artists that need syncing
    // Priority 1: Popular artists that have never been synced
    // Priority 2: Artists not synced in the last 7 days
    // Priority 3: Top trending artists
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 7);

    const artistsToSync = await db
      .select()
      .from(artists)
      .where(
        or(
          isNull(artists.lastFullSyncAt),
          lte(artists.lastFullSyncAt, staleDate),
          sql`${artists.trendingScore} > 0.5`
        )
      )
      .orderBy(
        desc(artists.popularity),
        desc(artists.trendingScore),
        desc(artists.followerCount)
      )
      .limit(20); // Limit to prevent timeout

    results.processed = artistsToSync.length;

    // Process each artist
    for (const artist of artistsToSync) {
      try {
        const syncUrl =
          process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
        const response = await fetch(`${syncUrl}/api/sync/unified-pipeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artist.id,
            mode: 'single',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          results.synced++;
          results.details.push({
            artist: artist.name,
            success: true,
            stats: result.results,
          });
        } else {
          results.errors++;
          results.details.push({
            artist: artist.name,
            success: false,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        results.errors++;
        results.details.push({
          artist: artist.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Add delay between syncs to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(2)}s`,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Cron sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
