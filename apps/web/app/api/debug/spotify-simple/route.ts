import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'Taylor Swift';

  try {
    // Check if credentials are configured
    const clientId = process.env['SPOTIFY_CLIENT_ID'];
    const clientSecret = process.env['SPOTIFY_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Spotify credentials not configured',
          solution:
            'Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env.local file',
        },
        { status: 500 }
      );
    }
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(
        `Spotify authentication failed: ${authResponse.status} ${authResponse.statusText} - ${errorText}`
      );
    }

    const authData = await authResponse.json();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${authData.access_token}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(
        `Artist search failed: ${searchResponse.status} ${searchResponse.statusText} - ${errorText}`
      );
    }

    const searchData = await searchResponse.json();

    // Test getting artist details if we found artists
    let artistDetails = null;
    if (searchData.artists.items.length > 0) {
      const firstArtist = searchData.artists.items[0];

      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists/${firstArtist.id}`,
        {
          headers: {
            Authorization: `Bearer ${authData.access_token}`,
          },
        }
      );

      if (artistResponse.ok) {
        artistDetails = await artistResponse.json();
      }
    }

    return NextResponse.json({
      success: true,
      query,
      apiConfigured: true,
      clientIdPrefix: clientId.substring(0, 8),
      response: {
        artistSearch: {
          hasArtists: !!searchData.artists.items.length,
          artistsCount: searchData.artists.items.length,
          total: searchData.artists.total,
          artists: searchData.artists.items.map((a: any) => ({
            id: a.id,
            name: a.name,
            popularity: a.popularity,
            followers: a.followers.total,
            genres: a.genres,
            images: a.images.map((img: any) => ({
              url: img.url,
              width: img.width,
              height: img.height,
            })),
          })),
        },
        artistDetails,
        rawResponse: {
          searchData: searchData.artists,
          artistDetails,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Spotify API test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query,
        apiConfigured: !!(
          process.env['SPOTIFY_CLIENT_ID'] && process.env['SPOTIFY_CLIENT_SECRET']
        ),
        baseUrl: 'https://api.spotify.com/v1/',
      },
      { status: 500 }
    );
  }
}
