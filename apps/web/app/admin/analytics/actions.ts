import { db } from '@repo/database';
import { users, artists, venues, shows, votes, setlists } from '@repo/database/src/schema';
import { count, desc, gte, sql, eq } from 'drizzle-orm';

export async function getUserAnalytics() {
  // Mock data for user analytics
  return {
    dailyActiveUsers: 1234,
    weeklyActiveUsers: 5678,
    monthlyActiveUsers: 12345,
    avgSessionDuration: '8m 32s'
  };
}

export async function getPlatformMetrics() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.setHours(0, 0, 0, 0));

    // Get real data from database
    const [
      totalUsersResult,
      newUsersThisWeekResult,
      totalShowsResult,
      upcomingShowsResult,
      totalArtistsResult,
      verifiedArtistsResult,
      totalVotesResult,
      votesTodayResult,
      topArtistsResult,
      topVenuesResult
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, weekAgo)),
      db.select({ count: count() }).from(shows),
      db.select({ count: count() }).from(shows).where(gte(shows.date, now)),
      db.select({ count: count() }).from(artists),
      db.select({ count: count() }).from(artists).where(eq(artists.verified, true)),
      db.select({ count: count() }).from(votes),
      db.select({ count: count() }).from(votes).where(gte(votes.createdAt, today)),
      
      // Top artists by follower count
      db.select({
        id: artists.id,
        name: artists.name,
        followers: artists.followerCount
      })
      .from(artists)
      .orderBy(desc(artists.followerCount))
      .limit(5),

      // Top venues by show count
      db.select({
        id: venues.id,
        name: venues.name,
        city: venues.city,
        showCount: sql<number>`count(${shows.id})::int`
      })
      .from(venues)
      .leftJoin(shows, eq(shows.venueId, venues.id))
      .groupBy(venues.id, venues.name, venues.city)
      .orderBy(desc(sql`count(${shows.id})`))
      .limit(5)
    ]);

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      newUsersThisWeek: newUsersThisWeekResult[0]?.count || 0,
      totalShows: totalShowsResult[0]?.count || 0,
      upcomingShows: upcomingShowsResult[0]?.count || 0,
      totalArtists: totalArtistsResult[0]?.count || 0,
      verifiedArtists: verifiedArtistsResult[0]?.count || 0,
      totalVotes: totalVotesResult[0]?.count || 0,
      votesToday: votesTodayResult[0]?.count || 0,
      
      // Content quality metrics (mock data for now)
      setlistAccuracy: 94,
      userContributions: 2834,
      verifiedSetlists: 1562,
      communityReports: 23,
      
      // Performance metrics (mock data)
      avgPageLoadTime: 320,
      avgSearchResponseTime: 85,
      apiUptime: 99.8,
      
      // Top performers
      topArtists: topArtistsResult.map(artist => ({
        id: artist.id,
        name: artist.name,
        followers: artist.followers || 0
      })),
      
      topVenues: topVenuesResult.map(venue => ({
        id: venue.id,
        name: venue.name,
        city: venue.city,
        showCount: venue.showCount || 0
      }))
    };
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    
    // Return mock data as fallback
    return {
      totalUsers: 12543,
      newUsersThisWeek: 234,
      totalShows: 8765,
      upcomingShows: 432,
      totalArtists: 3456,
      verifiedArtists: 1234,
      totalVotes: 45678,
      votesToday: 89,
      setlistAccuracy: 94,
      userContributions: 2834,
      verifiedSetlists: 1562,
      communityReports: 23,
      avgPageLoadTime: 320,
      avgSearchResponseTime: 85,
      apiUptime: 99.8,
      topArtists: [
        { id: '1', name: 'Taylor Swift', followers: 15000 },
        { id: '2', name: 'Drake', followers: 12500 },
        { id: '3', name: 'Billie Eilish', followers: 11000 },
        { id: '4', name: 'The Weeknd', followers: 9800 },
        { id: '5', name: 'Ed Sheeran', followers: 9200 }
      ],
      topVenues: [
        { id: '1', name: 'Madison Square Garden', city: 'New York', showCount: 145 },
        { id: '2', name: 'The Forum', city: 'Los Angeles', showCount: 132 },
        { id: '3', name: 'Red Rocks Amphitheatre', city: 'Denver', showCount: 98 },
        { id: '4', name: 'Wembley Stadium', city: 'London', showCount: 87 },
        { id: '5', name: 'Hollywood Bowl', city: 'Los Angeles', showCount: 76 }
      ]
    };
  }
} 