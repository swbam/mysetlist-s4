import { NextRequest, NextResponse } from 'next/server';

// Song search API with Spotify integration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const artistId = searchParams.get('artistId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({ songs: [] });
    }

    // Get Spotify access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Spotify access token');
    }

    const { access_token } = await tokenResponse.json();

    // Search Spotify for songs
    const searchQuery = encodeURIComponent(query);
    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!spotifyResponse.ok) {
      throw new Error('Failed to search Spotify');
    }

    const spotifyData = await spotifyResponse.json();
    
    // Transform Spotify data to our format
    const songs = spotifyData.tracks.items.map((track: any) => ({
      id: track.id, // Use Spotify ID as temp ID
      spotify_id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      album_art_url: track.album.images[0]?.url || null,
      duration_ms: track.duration_ms,
      is_explicit: track.explicit,
      preview_url: track.preview_url,
      external_urls: track.external_urls,
      popularity: track.popularity,
    }));

    return NextResponse.json({ songs });
  } catch (error) {
    console.error('Song search error:', error);
    return NextResponse.json(
      { error: 'Failed to search songs' },
      { status: 500 }
    );
  }
}