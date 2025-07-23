import { type NextRequest, NextResponse } from 'next/server';
import { db, artists, shows, songs, venues, setlists } from '@repo/database';
import { sql } from 'drizzle-orm';
import { ArtistSyncService, ShowSyncService, SetlistSyncService, VenueSyncService, SyncScheduler } from '@repo/external-apis';

/**
 * Test endpoint for sync services
 * GET /api/test/sync - Returns sync service status and configuration
 * POST /api/test/sync - Runs a test sync for a specific artist
 */
export async function GET() {
  try {
    // Check API configurations
    const config = {
      spotify: {
        configured: !!process.env['SPOTIFY_CLIENT_ID'] && !!process.env['SPOTIFY_CLIENT_SECRET'],
        clientId: process.env['SPOTIFY_CLIENT_ID'] ? '✅ Set' : '❌ Missing',
        clientSecret: process.env['SPOTIFY_CLIENT_SECRET'] ? '✅ Set' : '❌ Missing',
      },
      ticketmaster: {
        configured: !!process.env['TICKETMASTER_API_KEY'],
        apiKey: process.env['TICKETMASTER_API_KEY'] ? '✅ Set' : '❌ Missing',
      },
      setlistfm: {
        configured: !!process.env['SETLISTFM_API_KEY'],
        apiKey: process.env['SETLISTFM_API_KEY'] ? '✅ Set' : '❌ Missing',
      },
      database: {
        configured: !!process.env['DATABASE_URL'],
        url: process.env['DATABASE_URL'] ? '✅ Set' : '❌ Missing',
      },
    };

    // Get current data counts
    const [artistCount, songCount, showCount, venueCount, setlistCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(artists),
      db.select({ count: sql<number>`count(*)` }).from(songs),
      db.select({ count: sql<number>`count(*)` }).from(shows),
      db.select({ count: sql<number>`count(*)` }).from(venues),
      db.select({ count: sql<number>`count(*)` }).from(setlists),
    ]);

    const stats = {
      artists: artistCount[0]?.count || 0,
      songs: songCount[0]?.count || 0,
      shows: showCount[0]?.count || 0,
      venues: venueCount[0]?.count || 0,
      setlists: setlistCount[0]?.count || 0,
    };

    // Test service initialization
    const services = {
      artistSync: false,
      showSync: false,
      setlistSync: false,
      venueSync: false,
      scheduler: false,
    };

    try {
      new ArtistSyncService();
      services.artistSync = true;
    } catch (error) {
      console.error('ArtistSyncService init error:', error);
    }

    try {
      new ShowSyncService();
      services.showSync = true;
    } catch (error) {
      console.error('ShowSyncService init error:', error);
    }

    try {
      new SetlistSyncService();
      services.setlistSync = true;
    } catch (error) {
      console.error('SetlistSyncService init error:', error);
    }

    try {
      new VenueSyncService();
      services.venueSync = true;
    } catch (error) {
      console.error('VenueSyncService init error:', error);
    }

    try {
      new SyncScheduler();
      services.scheduler = true;
    } catch (error) {
      console.error('SyncScheduler init error:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Sync services status',
      timestamp: new Date().toISOString(),
      config,
      stats,
      services,
      ready: Object.values(config).every(c => c.configured) && Object.values(services).every(s => s),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Test sync for a specific artist
 */
export async function POST(request: NextRequest) {
  try {
    const { artistName = 'Taylor Swift' } = await request.json();

    console.log(`Starting test sync for artist: ${artistName}`);

    const scheduler = new SyncScheduler();
    const startTime = Date.now();

    // Run sync
    await scheduler.syncArtistData(artistName);

    // Get results
    const [artist] = await db
      .select()
      .from(artists)
      .where(sql`LOWER(${artists.name}) = LOWER(${artistName})`)
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        {
          error: 'Artist not found after sync',
          artistName,
        },
        { status: 404 }
      );
    }

    // Get counts for this artist
    const [songCount, showCount, setlistCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(songs)
        .where(sql`${songs.artist} = ${artist.name}`),
      db.select({ count: sql<number>`count(*)` }).from(shows)
        .where(sql`${shows.headlinerArtistId} = ${artist.id}`),
      db.select({ count: sql<number>`count(*)` }).from(setlists)
        .where(sql`${setlists.artistId} = ${artist.id}`),
    ]);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Test sync completed for ${artistName}`,
      duration: `${(duration / 1000).toFixed(2)}s`,
      artist: {
        id: artist.id,
        name: artist.name,
        spotifyId: artist.spotifyId,
        followers: artist.followers,
        popularity: artist.popularity,
        genres: artist.genres,
        lastSyncedAt: artist.lastSyncedAt,
      },
      stats: {
        songs: songCount[0]?.count || 0,
        shows: showCount[0]?.count || 0,
        setlists: setlistCount[0]?.count || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Test sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}