import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'],
    csrf: {
      disabled_for_development: process.env['NODE_ENV'] === 'development',
      enabled_for_production: process.env['NODE_ENV'] === 'production',
    },
    apis: {
      spotify: {
        client_id_configured: !!process.env['SPOTIFY_CLIENT_ID'],
        client_secret_configured: !!process.env['SPOTIFY_CLIENT_SECRET'],
        auth_test: null as any,
      },
      ticketmaster: {
        api_key_configured: !!process.env['TICKETMASTER_API_KEY'],
        connection_test: null as any,
      },
      setlistfm: {
        api_key_configured: !!process.env['SETLISTFM_API_KEY'],
        connection_test: null as any,
      },
    },
    database: {
      configured:
        !!process.env['DATABASE_URL'] || !!process.env['NEXT_PUBLIC_SUPABASE_URL'],
      connection_test: null as any,
    },
  };

  // Test Spotify authentication
  if (
    results.apis.spotify.client_id_configured &&
    results.apis.spotify.client_secret_configured
  ) {
    try {
      const authResponse = await fetch(
        'https://accounts.spotify.com/api/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${process.env['SPOTIFY_CLIENT_ID']}:${process.env['SPOTIFY_CLIENT_SECRET']}`).toString('base64')}`,
          },
          body: 'grant_type=client_credentials',
        }
      );

      results.apis.spotify.auth_test = {
        success: authResponse.ok,
        status: authResponse.status,
        error: authResponse.ok
          ? null
          : `Failed with status ${authResponse.status}`,
      };
    } catch (error) {
      results.apis.spotify.auth_test = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Test Ticketmaster API
  if (results.apis.ticketmaster.api_key_configured) {
    try {
      const tmResponse = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env['TICKETMASTER_API_KEY']}&size=1`
      );

      results.apis.ticketmaster.connection_test = {
        success: tmResponse.ok,
        status: tmResponse.status,
        error: tmResponse.ok ? null : `Failed with status ${tmResponse.status}`,
      };
    } catch (error) {
      results.apis.ticketmaster.connection_test = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Test Setlist.fm API
  if (results.apis.setlistfm.api_key_configured) {
    try {
      const setlistResponse = await fetch(
        'https://api.setlist.fm/rest/1.0/search/artists?artistName=test&p=1',
        {
          headers: {
            'x-api-key': process.env['SETLISTFM_API_KEY']!,
            Accept: 'application/json',
            'User-Agent': 'MySetlist/1.0',
          },
        }
      );

      results.apis.setlistfm.connection_test = {
        success: setlistResponse.ok,
        status: setlistResponse.status,
        error: setlistResponse.ok
          ? null
          : `Failed with status ${setlistResponse.status}`,
      };
    } catch (error) {
      results.apis.setlistfm.connection_test = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Test database connection
  try {
    const { db } = await import('@repo/database');
    const { sql } = await import('drizzle-orm');
    const testQuery = await db.execute(
      sql`SELECT 1 as test, current_timestamp`
    );
    results.database.connection_test = {
      success: true,
      query_result: testQuery[0],
    };
  } catch (error) {
    results.database.connection_test = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const allConfigured =
    results.apis.spotify.client_id_configured &&
    results.apis.spotify.client_secret_configured &&
    results.apis.ticketmaster.api_key_configured;

  const allWorking =
    results.apis.spotify.auth_test?.success &&
    results.apis.ticketmaster.connection_test?.success &&
    results.database.connection_test?.success;

  return NextResponse.json({
    success: true,
    all_configured: allConfigured,
    all_working: allWorking,
    ...results,
  });
}
