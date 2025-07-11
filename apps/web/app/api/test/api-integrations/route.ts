import { type NextRequest, NextResponse } from 'next/server';

// Test all external API integrations
export async function GET(_request: NextRequest) {
  const results = {
    spotify: {
      configured: false,
      authenticated: false,
      error: null as string | null,
    },
    ticketmaster: {
      configured: false,
      tested: false,
      error: null as string | null,
    },
    setlistfm: {
      configured: false,
      tested: false,
      error: null as string | null,
    },
    csrf: {
      enabled: true,
      development: process.env['NODE_ENV'] === 'development',
    },
  };

  // Test Spotify
  if (process.env['SPOTIFY_CLIENT_ID'] && process.env['SPOTIFY_CLIENT_SECRET']) {
    results.spotify.configured = true;
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env['SPOTIFY_CLIENT_ID']}:${process.env['SPOTIFY_CLIENT_SECRET']}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (response.ok) {
        const data = await response.json();
        results.spotify.authenticated = !!data.access_token;
      } else {
        results.spotify.error = `Authentication failed: ${response.status}`;
      }
    } catch (error) {
      results.spotify.error =
        error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Test Ticketmaster
  if (process.env['TICKETMASTER_API_KEY']) {
    results.ticketmaster.configured = true;
    try {
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env['TICKETMASTER_API_KEY']}&size=1`
      );

      if (response.ok) {
        results.ticketmaster.tested = true;
      } else {
        results.ticketmaster.error = `API test failed: ${response.status}`;
      }
    } catch (error) {
      results.ticketmaster.error =
        error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Test Setlist.fm
  if (process.env['SETLISTFM_API_KEY']) {
    results.setlistfm.configured = true;
    try {
      const response = await fetch(
        'https://api.setlist.fm/rest/1.0/search/artists?artistName=test&p=1',
        {
          headers: {
            'x-api-key': process.env['SETLISTFM_API_KEY']!,
            Accept: 'application/json',
            'User-Agent': 'MySetlist/1.0',
          },
        }
      );

      if (response.ok) {
        results.setlistfm.tested = true;
      } else {
        results.setlistfm.error = `API test failed: ${response.status}`;
      }
    } catch (error) {
      results.setlistfm.error =
        error instanceof Error ? error.message : 'Unknown error';
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'],
    results,
    recommendations: {
      spotify: results.spotify.configured
        ? null
        : 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to env',
      ticketmaster: results.ticketmaster.configured
        ? null
        : 'Add TICKETMASTER_API_KEY to env',
      setlistfm: results.setlistfm.configured
        ? null
        : 'Add SETLISTFM_API_KEY to env (optional)',
    },
  });
}
