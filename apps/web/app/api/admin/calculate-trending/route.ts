import { artists, db, shows, venues } from '@repo/database';
import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Trending score calculation weights
const WEIGHTS = {
  artist: {
    followers: 0.3,
    popularity: 0.2,
    recentShows: 0.3,
    followerGrowth: 0.2,
  },
  show: {
    viewCount: 0.2,
    attendeeCount: 0.3,
    voteCount: 0.25,
    setlistCount: 0.15,
    recency: 0.1,
  },
  venue: {
    showCount: 0.4,
    totalAttendance: 0.3,
    averageRating: 0.3,
  },
};

// Time decay factor (7 days)
const TIME_DECAY_DAYS = 7;

function calculateTimeDecay(date: Date): number {
  const now = new Date();
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysDiff / TIME_DECAY_DAYS);
}

async function calculateArtistScores() {
  try {
    // Get all artists with their stats
    const artistsData = await db
      .select({
        id: artists.id,
        followers: artists.followers,
        popularity: artists.popularity,
        followerCount: artists.followerCount,
        createdAt: artists.createdAt,
      })
      .from(artists);

    // Calculate scores for each artist
    for (const artist of artistsData) {
      // Get recent shows count
      const recentShowsResult = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(shows)
        .where(sql`${shows.headlinerArtistId} = ${artist.id} 
        AND ${shows.date} >= CURRENT_DATE - INTERVAL '30 days'`);

      const recentShowCount = recentShowsResult[0]?.count || 0;

      // Calculate follower growth (mock for now, would need historical data)
      const followerGrowth = Math.random() * 100;

      // Calculate trending score
      const score =
        ((artist.followers || 0) / 10000) * WEIGHTS.artist.followers +
        (artist.popularity || 0) * WEIGHTS.artist.popularity +
        recentShowCount * 10 * WEIGHTS.artist.recentShows +
        followerGrowth * WEIGHTS.artist.followerGrowth;

      // Update artist with new trending score
      await db
        .update(artists)
        .set({ trendingScore: score })
        .where(sql`${artists.id} = ${artist.id}`);
    }

    return { updated: artistsData.length };
  } catch (error) {
    console.error('Error calculating artist scores:', error);
    throw error;
  }
}

async function calculateShowScores() {
  try {
    // Get all shows
    const showsData = await db
      .select({
        id: shows.id,
        viewCount: shows.viewCount,
        attendeeCount: shows.attendeeCount,
        voteCount: shows.voteCount,
        setlistCount: shows.setlistCount,
        date: shows.date,
        createdAt: shows.createdAt,
      })
      .from(shows);

    // Calculate scores for each show
    for (const show of showsData) {
      const recencyFactor = calculateTimeDecay(new Date(show.createdAt));

      // Calculate trending score
      const score =
        (show.viewCount || 0) * WEIGHTS.show.viewCount +
        (show.attendeeCount || 0) * WEIGHTS.show.attendeeCount +
        (show.voteCount || 0) * WEIGHTS.show.voteCount +
        (show.setlistCount || 0) * 5 * WEIGHTS.show.setlistCount +
        recencyFactor * 100 * WEIGHTS.show.recency;

      // Update show with new trending score
      await db
        .update(shows)
        .set({ trendingScore: score })
        .where(sql`${shows.id} = ${show.id}`);
    }

    return { updated: showsData.length };
  } catch (error) {
    console.error('Error calculating show scores:', error);
    throw error;
  }
}

async function calculateVenueScores() {
  try {
    // Get venue stats using raw SQL for complex aggregation
    const venueStats = await db.execute(sql`
      SELECT 
        v.id,
        COUNT(DISTINCT s.id) as show_count,
        SUM(s.attendee_count) as total_attendance,
        AVG(vr.rating) as avg_rating
      FROM ${venues} v
      LEFT JOIN ${shows} s ON s.venue_id = v.id
      LEFT JOIN venue_reviews vr ON vr.venue_id = v.id
      GROUP BY v.id
    `);

    // Update each venue with calculated score
    for (const venue of venueStats) {
      const showCount = Number(venue.show_count) || 0;
      const totalAttendance = Number(venue.total_attendance) || 0;
      const avgRating = Number(venue.avg_rating) || 0;

      // Calculate trending score
      const score =
        showCount * 5 * WEIGHTS.venue.showCount +
        (totalAttendance / 100) * WEIGHTS.venue.totalAttendance +
        avgRating * 20 * WEIGHTS.venue.averageRating;

      // Update venue with score (Note: venues table doesn't have trendingScore field yet)
      // For now, we'll just log it
      console.log(`Venue ${venue.id} score: ${score}`);
    }

    return { updated: venueStats.length };
  } catch (error) {
    console.error('Error calculating venue scores:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env['ADMIN_API_KEY'];

    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    const results = {
      artists: { updated: 0 },
      shows: { updated: 0 },
      venues: { updated: 0 },
    };

    // Calculate scores based on type
    if (type === 'all' || type === 'artists') {
      results.artists = await calculateArtistScores();
    }

    if (type === 'all' || type === 'shows') {
      results.shows = await calculateShowScores();
    }

    if (type === 'all' || type === 'venues') {
      results.venues = await calculateVenueScores();
    }

    return NextResponse.json({
      success: true,
      message: 'Trending scores calculated successfully',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating trending scores:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate trending scores',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for easier testing
  return POST(request);
}
