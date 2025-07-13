import { getUserFromRequest } from '@repo/auth/server';
import { artists, db, userFollowsArtists } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Mock function to simulate Spotify API call
// In production, this would use the actual Spotify Web API
async function getSpotifyFollowedArtists(_accessToken: string) {
  // This would be replaced with actual Spotify API call:
  // GET https://api.spotify.com/v1/me/following?type=artist

  // For now, return mock data
  return {
    artists: {
      items: [
        {
          id: 'spotify_1',
          name: 'Taylor Swift',
          images: [{ url: 'https://i.scdn.co/image/taylor-swift' }],
          genres: ['pop', 'country'],
        },
        {
          id: 'spotify_2',
          name: 'The Weeknd',
          images: [{ url: 'https://i.scdn.co/image/the-weeknd' }],
          genres: ['r&b', 'pop'],
        },
        {
          id: 'spotify_3',
          name: 'Billie Eilish',
          images: [{ url: 'https://i.scdn.co/image/billie-eilish' }],
          genres: ['pop', 'alternative'],
        },
      ],
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has Spotify connected
    if (user.app_metadata?.provider !== 'spotify') {
      return NextResponse.json(
        { error: 'Spotify account not connected' },
        { status: 400 }
      );
    }

    // Get Spotify access token (would come from OAuth in production)
    const accessToken = user.app_metadata?.['provider_token'] || 'mock_token';

    // Fetch user's followed artists from Spotify
    const spotifyData = await getSpotifyFollowedArtists(accessToken);

    let syncedCount = 0;
    const artistsToSync: any[] = [];

    // Process each Spotify artist
    for (const spotifyArtist of spotifyData.artists.items) {
      // Find matching artist in our database by name
      const [existingArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.name, spotifyArtist.name))
        .limit(1);

      if (existingArtist) {
        // Check if user already follows this artist
        const [existingFollow] = await db
          .select()
          .from(userFollowsArtists)
          .where(
            and(
              eq(userFollowsArtists.userId, user.id),
              eq(userFollowsArtists.artistId, existingArtist.id)
            )
          )
          .limit(1);

        if (!existingFollow) {
          artistsToSync.push({
            userId: user.id,
            artistId: existingArtist.id,
          });
          syncedCount++;
        }
      } else {
      }
    }

    // Bulk insert all new follows
    if (artistsToSync.length > 0) {
      await db.insert(userFollowsArtists).values(artistsToSync);
    }

    return NextResponse.json({
      syncedCount,
      totalSpotifyArtists: spotifyData.artists.items.length,
      message: `Successfully synced ${syncedCount} artists from Spotify`,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to sync Spotify artists' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Spotify connection status
    const isSpotifyConnected = user.app_metadata?.provider === 'spotify';

    return NextResponse.json({
      isSpotifyConnected,
      spotifyEmail: isSpotifyConnected ? user.email : null,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to check Spotify status' },
      { status: 500 }
    );
  }
}
