import { NextRequest, NextResponse } from 'next/server';

// Spotify API Client
class SpotifyClient {
  private accessToken?: string;

  async authenticate() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async searchArtists(query: string, limit = 10) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    return response.json();
  }
}

// Ticketmaster API Client
class TicketmasterClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error('Ticketmaster API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchEvents(options: {
    keyword?: string;
    city?: string;
    size?: number;
  }) {
    const params = new URLSearchParams();
    params.append('apikey', this.apiKey);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Ticketmaster search failed: ${response.status}`);
    }

    return response.json();
  }
}

// Setlist.fm API Client
class SetlistFmClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.SETLISTFM_API_KEY;
    if (!apiKey) {
      throw new Error('Setlist.fm API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchArtists(artistName: string, page = 1) {
    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&p=${page}`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'MySetlist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Setlist.fm artist search failed: ${response.status}`);
    }

    return response.json();
  }

  async searchSetlists(options: {
    artistName?: string;
    p?: number;
  }) {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/setlists?${params}`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'MySetlist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Setlist.fm setlist search failed: ${response.status}`);
    }

    return response.json();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist') || 'Taylor Swift';

    console.log(`🔍 Testing all external APIs with artist: "${artist}"`);

    // Test all APIs in parallel
    const spotifyClient = new SpotifyClient();
    const ticketmasterClient = new TicketmasterClient();
    const setlistfmClient = new SetlistFmClient();

    const [spotifyResult, ticketmasterResult, setlistfmResult] = await Promise.allSettled([
      spotifyClient.searchArtists(artist, 5),
      ticketmasterClient.searchEvents({ keyword: artist, size: 5 }),
      setlistfmClient.searchArtists(artist, 1),
    ]);

    const response = {
      success: true,
      artist,
      timestamp: new Date().toISOString(),
      results: {
        spotify: spotifyResult.status === 'fulfilled' ? {
          success: true,
          artistCount: spotifyResult.value.artists.items.length,
          total: spotifyResult.value.artists.total,
          artists: spotifyResult.value.artists.items.slice(0, 3).map((a: any) => ({
            id: a.id,
            name: a.name,
            popularity: a.popularity,
            followers: a.followers.total,
            genres: a.genres,
            imageUrl: a.images[0]?.url
          }))
        } : {
          success: false,
          error: spotifyResult.reason?.message
        },
        ticketmaster: ticketmasterResult.status === 'fulfilled' ? {
          success: true,
          eventCount: ticketmasterResult.value._embedded?.events?.length || 0,
          total: ticketmasterResult.value.page?.totalElements || 0,
          events: ticketmasterResult.value._embedded?.events?.slice(0, 3).map((e: any) => ({
            id: e.id,
            name: e.name,
            date: e.dates.start.localDate,
            venue: e._embedded?.venues?.[0]?.name,
            city: e._embedded?.venues?.[0]?.city?.name
          })) || []
        } : {
          success: false,
          error: ticketmasterResult.reason?.message
        },
        setlistfm: setlistfmResult.status === 'fulfilled' ? {
          success: true,
          artistCount: setlistfmResult.value.artist?.length || 0,
          total: setlistfmResult.value.total || 0,
          artists: setlistfmResult.value.artist?.slice(0, 3).map((a: any) => ({
            mbid: a.mbid,
            name: a.name,
            sortName: a.sortName
          })) || []
        } : {
          success: false,
          error: setlistfmResult.reason?.message
        }
      }
    };

    // Test setlists if we found an artist
    if (setlistfmResult.status === 'fulfilled' && setlistfmResult.value.artist?.length > 0) {
      try {
        const setlistData = await setlistfmClient.searchSetlists({
          artistName: artist,
          p: 1
        });
        
        response.results.setlistfm.setlistCount = setlistData.setlist?.length || 0;
        response.results.setlistfm.setlists = setlistData.setlist?.slice(0, 2).map((s: any) => ({
          id: s.id,
          eventDate: s.eventDate,
          venueName: s.venue.name,
          cityName: s.venue.city.name,
          songCount: s.sets.set.reduce((count: number, set: any) => count + set.song.length, 0)
        })) || [];
      } catch (error) {
        console.error('Failed to fetch setlists:', error);
      }
    }

    console.log('✅ All external API tests completed');
    return NextResponse.json(response);

  } catch (error) {
    console.error('External API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}