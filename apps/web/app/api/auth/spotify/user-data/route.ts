import { NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's session to access the provider token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.provider_token) {
      return NextResponse.json(
        { error: 'No Spotify session found' },
        { status: 401 }
      );
    }

    const spotifyToken = session.provider_token;

    // Fetch user's top artists
    const topArtistsResponse = await fetch(
      'https://api.spotify.com/v1/me/top/artists?limit=50',
      {
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
        },
      }
    );

    // Fetch user's followed artists
    const followedArtistsResponse = await fetch(
      'https://api.spotify.com/v1/me/following?type=artist&limit=50',
      {
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
        },
      }
    );

    if (!topArtistsResponse.ok || !followedArtistsResponse.ok) {
      // Token might be expired, try to refresh
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError || !refreshData.session?.provider_token) {
        return NextResponse.json(
          { error: 'Failed to refresh Spotify token' },
          { status: 401 }
        );
      }

      // Retry with new token
      const newToken = refreshData.session.provider_token;

      const retryTopResponse = await fetch(
        'https://api.spotify.com/v1/me/top/artists?limit=50',
        {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        }
      );

      const retryFollowedResponse = await fetch(
        'https://api.spotify.com/v1/me/following?type=artist&limit=50',
        {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        }
      );

      if (!retryTopResponse.ok || !retryFollowedResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch Spotify data' },
          { status: 500 }
        );
      }

      const topData = await retryTopResponse.json();
      const followedData = await retryFollowedResponse.json();

      return NextResponse.json({
        topArtists: topData.items || [],
        followedArtists: followedData.artists?.items || [],
      });
    }

    const topArtistsData = await topArtistsResponse.json();
    const followedArtistsData = await followedArtistsResponse.json();

    // Store user's Spotify data in database for recommendations
    await storeUserSpotifyData(
      user.id,
      topArtistsData.items,
      followedArtistsData.artists?.items || []
    );

    return NextResponse.json({
      topArtists: topArtistsData.items || [],
      followedArtists: followedArtistsData.artists?.items || [],
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function storeUserSpotifyData(
  userId: string,
  topArtists: any[],
  followedArtists: any[]
) {
  try {
    const supabase = await createClient();

    // Store user's music preferences
    const { error } = await supabase.from('user_music_preferences').upsert(
      {
        user_id: userId,
        top_artists: topArtists.map((a) => ({
          id: a.id,
          name: a.name,
          genres: a.genres,
        })),
        followed_artists: followedArtists.map((a) => ({
          id: a.id,
          name: a.name,
          genres: a.genres,
        })),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
    }
  } catch (_error) {}
}
