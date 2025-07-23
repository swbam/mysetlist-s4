import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { setlists, shows, artists, venues, setlistSongs, songs, votes, users, userProfiles } from '@repo/database';
import { desc, eq, sql, count, sum } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '12');
    const timeframe = searchParams.get('timeframe') || 'week';

    // Query recent setlists with related data and vote counts
    const recentSetlists = await db
      .select({
        id: setlists.id,
        name: setlists.name,
        type: setlists.type,
        totalVotes: setlists.totalVotes,
        accuracyScore: setlists.accuracyScore,
        createdAt: setlists.createdAt,
        isLocked: setlists.isLocked,
        showId: shows.id,
        showName: shows.name,
        showSlug: shows.slug,
        showDate: shows.date,
        showStatus: shows.status,
        artistId: artists.id,
        artistName: artists.name,
        artistSlug: artists.slug,
        artistImage: artists.imageUrl,
        venueName: venues.name,
        venueCity: venues.city,
        venueState: venues.state,
        creatorId: users.id,
        creatorName: users.displayName,
        creatorAvatar: userProfiles.avatarUrl,
        songCount: sql<number>`COALESCE(COUNT(DISTINCT ${setlistSongs.id}), 0)::int`,
        voteCount: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'up' THEN 1 WHEN ${votes.voteType} = 'down' THEN -1 ELSE 0 END), 0)::int`,
      })
      .from(setlists)
      .innerJoin(shows, eq(setlists.showId, shows.id))
      .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .leftJoin(users, eq(setlists.createdBy, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(setlistSongs, eq(setlists.id, setlistSongs.setlistId))
      .leftJoin(votes, eq(setlistSongs.id, votes.setlistSongId))
      .groupBy(
        setlists.id,
        setlists.name,
        setlists.type,
        setlists.totalVotes,
        setlists.accuracyScore,
        setlists.createdAt,
        setlists.isLocked,
        shows.id,
        shows.name,
        shows.slug,
        shows.date,
        shows.status,
        artists.id,
        artists.name,
        artists.slug,
        artists.imageUrl,
        venues.name,
        venues.city,
        venues.state,
        users.id,
        users.displayName,
        userProfiles.avatarUrl
      )
      .orderBy(desc(setlists.createdAt))
      .limit(limit);

    // Format the data for frontend consumption
    const formattedSetlists = recentSetlists.map((setlist, index) => ({
      id: setlist.id,
      name: setlist.name,
      type: setlist.type,
      totalVotes: setlist.totalVotes || 0,
      voteCount: setlist.voteCount || 0,
      songCount: setlist.songCount || 0,
      accuracyScore: setlist.accuracyScore || 0,
      isLocked: setlist.isLocked,
      createdAt: setlist.createdAt.toISOString(),
      rank: index + 1,
      show: {
        id: setlist.showId,
        name: setlist.showName,
        slug: setlist.showSlug,
        date: setlist.showDate?.toISOString() || null,
        status: setlist.showStatus,
      },
      artist: {
        id: setlist.artistId,
        name: setlist.artistName || 'Unknown Artist',
        slug: setlist.artistSlug,
        imageUrl: setlist.artistImage,
      },
      venue: {
        name: setlist.venueName,
        city: setlist.venueCity,
        state: setlist.venueState,
      },
      creator: setlist.creatorId ? {
        id: setlist.creatorId,
        name: setlist.creatorName || 'Anonymous',
        avatarUrl: setlist.creatorAvatar,
      } : null,
    }));

    const response = NextResponse.json({
      setlists: formattedSetlists,
      timeframe,
      total: formattedSetlists.length,
      generatedAt: new Date().toISOString(),
    });

    // Add cache headers
    response.headers.set(
      'Cache-Control', 
      'public, s-maxage=60, stale-while-revalidate=180'
    );

    return response;
  } catch (error) {
    console.error('Error fetching recent setlists:', error);
    
    // Return fallback data instead of error to prevent UI crashes
    const fallbackData = {
      setlists: [],
      timeframe: request.nextUrl.searchParams.get('timeframe') || 'week',
      total: 0,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: 'Unable to load recent setlists at this time',
    };

    return NextResponse.json(fallbackData, {
      status: 200, // Return 200 to prevent UI crashes
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=180',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { showId, artistId, type, name } = await request.json();

    if (!showId || !artistId || !type || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: showId, artistId, type, name' },
        { status: 400 }
      );
    }

    if (!['predicted', 'actual'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "predicted" or "actual"' },
        { status: 400 }
      );
    }

    // Create the setlist
    const newSetlist = await db
      .insert(setlists)
      .values({
        showId,
        artistId,
        type,
        name,
        orderIndex: 0,
        isLocked: false,
        totalVotes: 0,
        accuracyScore: 0,
        createdBy: user.id,
      })
      .returning();

    return NextResponse.json(newSetlist[0]);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create setlist' },
      { status: 500 }
    );
  }
}
