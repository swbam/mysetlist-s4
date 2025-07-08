import { artists, db, shows, venues } from '@repo/database';
import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Generate realistic random data based on different patterns
function generateRealisticMetrics(
  type: 'popular' | 'rising' | 'steady' | 'new'
) {
  const patterns = {
    popular: {
      views: [5000, 20000],
      votes: [100, 500],
      attendees: [200, 1000],
      followers: [50000, 500000],
      popularity: [70, 100],
    },
    rising: {
      views: [1000, 5000],
      votes: [50, 200],
      attendees: [100, 400],
      followers: [10000, 50000],
      popularity: [50, 70],
    },
    steady: {
      views: [500, 2000],
      votes: [20, 100],
      attendees: [50, 200],
      followers: [5000, 20000],
      popularity: [30, 50],
    },
    new: {
      views: [100, 1000],
      votes: [5, 50],
      attendees: [20, 100],
      followers: [1000, 10000],
      popularity: [10, 30],
    },
  };

  const pattern = patterns[type];

  return {
    views: Math.floor(
      Math.random() * (pattern.views[1] - pattern.views[0]) + pattern.views[0]
    ),
    votes: Math.floor(
      Math.random() * (pattern.votes[1] - pattern.votes[0]) + pattern.votes[0]
    ),
    attendees: Math.floor(
      Math.random() * (pattern.attendees[1] - pattern.attendees[0]) +
        pattern.attendees[0]
    ),
    followers: Math.floor(
      Math.random() * (pattern.followers[1] - pattern.followers[0]) +
        pattern.followers[0]
    ),
    popularity: Math.floor(
      Math.random() * (pattern.popularity[1] - pattern.popularity[0]) +
        pattern.popularity[0]
    ),
  };
}

async function seedArtistData() {
  try {
    // Get all artists
    const allArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
      })
      .from(artists);

    if (allArtists.length === 0) {
      console.log('No artists found to seed');
      return { updated: 0 };
    }

    // Assign pattern types to artists
    const artistUpdates = allArtists.map((artist, index) => {
      let pattern: 'popular' | 'rising' | 'steady' | 'new';

      // Distribute patterns: 10% popular, 20% rising, 40% steady, 30% new
      const rand = Math.random();
      if (rand < 0.1) pattern = 'popular';
      else if (rand < 0.3) pattern = 'rising';
      else if (rand < 0.7) pattern = 'steady';
      else pattern = 'new';

      const metrics = generateRealisticMetrics(pattern);

      // Calculate trending score
      const trendingScore =
        (metrics.followers / 10000) * 0.3 +
        metrics.popularity * 0.2 +
        Math.random() * 50 * 0.3 + // Mock recent shows
        Math.random() * 100 * 0.2; // Mock growth

      return {
        id: artist.id,
        followers: metrics.followers,
        popularity: metrics.popularity,
        followerCount: Math.floor(metrics.followers / 100), // App followers
        trendingScore,
      };
    });

    // Update artists in batches
    for (const update of artistUpdates) {
      await db
        .update(artists)
        .set({
          followers: update.followers,
          popularity: update.popularity,
          followerCount: update.followerCount,
          trendingScore: update.trendingScore,
        })
        .where(sql`${artists.id} = ${update.id}`);
    }

    return { updated: artistUpdates.length };
  } catch (error) {
    console.error('Error seeding artist data:', error);
    throw error;
  }
}

async function seedShowData() {
  try {
    // Get all shows
    const allShows = await db
      .select({
        id: shows.id,
        name: shows.name,
        date: shows.date,
      })
      .from(shows);

    if (allShows.length === 0) {
      console.log('No shows found to seed');
      return { updated: 0 };
    }

    // Assign pattern types to shows based on date
    const showUpdates = allShows.map((show) => {
      const showDate = new Date(show.date);
      const now = new Date();
      const daysDiff =
        (now.getTime() - showDate.getTime()) / (1000 * 60 * 60 * 24);

      let pattern: 'popular' | 'rising' | 'steady' | 'new';

      // Recent shows are more likely to be popular/rising
      if (daysDiff < 7) {
        pattern = Math.random() < 0.3 ? 'popular' : 'rising';
      } else if (daysDiff < 30) {
        pattern = Math.random() < 0.5 ? 'rising' : 'steady';
      } else {
        pattern = Math.random() < 0.7 ? 'steady' : 'new';
      }

      const metrics = generateRealisticMetrics(pattern);

      // Calculate trending score with time decay
      const recencyFactor = Math.max(0, 1 - daysDiff / 7);
      const trendingScore =
        metrics.views * 0.2 +
        metrics.attendees * 0.3 +
        metrics.votes * 0.25 +
        Math.floor(metrics.votes / 10) * 5 * 0.15 + // Mock setlist count
        recencyFactor * 100 * 0.1;

      return {
        id: show.id,
        viewCount: metrics.views,
        attendeeCount: metrics.attendees,
        voteCount: metrics.votes,
        setlistCount: Math.floor(metrics.votes / 10),
        trendingScore,
      };
    });

    // Update shows in batches
    for (const update of showUpdates) {
      await db
        .update(shows)
        .set({
          viewCount: update.viewCount,
          attendeeCount: update.attendeeCount,
          voteCount: update.voteCount,
          setlistCount: update.setlistCount,
          trendingScore: update.trendingScore,
        })
        .where(sql`${shows.id} = ${update.id}`);
    }

    return { updated: showUpdates.length };
  } catch (error) {
    console.error('Error seeding show data:', error);
    throw error;
  }
}

async function seedVenueData() {
  try {
    // Get venue show counts
    const venueStats = await db.execute(sql`
      SELECT 
        v.id,
        v.name,
        COUNT(DISTINCT s.id) as show_count
      FROM ${venues} v
      LEFT JOIN ${shows} s ON s.venue_id = v.id
      GROUP BY v.id, v.name
    `);

    const updates = venueStats.map((venue) => {
      const showCount = Number(venue.show_count) || 0;

      // Venues with more shows get higher base metrics
      let pattern: 'popular' | 'rising' | 'steady' | 'new';
      if (showCount > 10) pattern = 'popular';
      else if (showCount > 5) pattern = 'rising';
      else if (showCount > 0) pattern = 'steady';
      else pattern = 'new';

      const metrics = generateRealisticMetrics(pattern);

      return {
        id: venue.id,
        showCount,
        metrics,
      };
    });

    // Note: venues table doesn't have these fields yet, so we'll just log
    console.log(`Generated metrics for ${updates.length} venues`);

    return { updated: updates.length };
  } catch (error) {
    console.error('Error seeding venue data:', error);
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

    // Seed data based on type
    if (type === 'all' || type === 'artists') {
      results.artists = await seedArtistData();
    }

    if (type === 'all' || type === 'shows') {
      results.shows = await seedShowData();
    }

    if (type === 'all' || type === 'venues') {
      results.venues = await seedVenueData();
    }

    return NextResponse.json({
      success: true,
      message: 'Trending data seeded successfully',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error seeding trending data:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed trending data',
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
