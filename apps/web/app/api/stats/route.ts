import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { 
  userFollowsArtists, 
  userShowAttendance, 
  votes, 
  showComments,
  venueReviews,
  shows,
  artists
} from '@repo/database';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // all, year, month, week
    
    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Get user statistics
    const stats = await getUserStats(user.id, startDate);
    
    // Get recent activity
    const recentActivity = await getUserRecentActivity(user.id, 10);
    
    // Get top artists by shows attended
    const topArtists = await getUserTopArtists(user.id, 5);
    
    // Get concert attendance by month
    const attendanceByMonth = await getUserAttendanceByMonth(user.id);

    return NextResponse.json({
      stats,
      recentActivity,
      topArtists,
      attendanceByMonth,
      period,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

async function getUserStats(userId: string, startDate: Date | null) {
  const conditions = startDate ? 
    and(
      eq(userFollowsArtists.userId, userId),
      gte(userFollowsArtists.createdAt, startDate)
    ) : eq(userFollowsArtists.userId, userId);

  const [
    followedArtistsResult,
    attendanceResult,
    votesResult,
    commentsResult,
    reviewsResult
  ] = await Promise.all([
    // Followed artists count
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userFollowsArtists)
      .where(eq(userFollowsArtists.userId, userId)),
    
    // Show attendance counts
    db
      .select({
        status: userShowAttendance.status,
        count: sql<number>`COUNT(*)`
      })
      .from(userShowAttendance)
      .where(eq(userShowAttendance.userId, userId))
      .groupBy(userShowAttendance.status),
    
    // Votes count
    db
      .select({
        voteType: votes.voteType,
        count: sql<number>`COUNT(*)`
      })
      .from(votes)
      .where(eq(votes.userId, userId))
      .groupBy(votes.voteType),
    
    // Comments count
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(showComments)
      .where(eq(showComments.userId, userId)),
    
    // Reviews count
    db
      .select({ 
        count: sql<number>`COUNT(*)`,
        avgRating: sql<number>`AVG(rating)`
      })
      .from(venueReviews)
      .where(eq(venueReviews.userId, userId))
  ]);

  // Process attendance data
  const attendance = {
    going: 0,
    interested: 0,
    not_going: 0
  };
  
  attendanceResult.forEach(row => {
    attendance[row.status] = row.count;
  });

  // Process votes data
  const votesData = {
    upvotes: 0,
    downvotes: 0
  };
  
  votesResult.forEach(row => {
    if (row.voteType === 'up') votesData.upvotes = row.count;
    if (row.voteType === 'down') votesData.downvotes = row.count;
  });

  return {
    followedArtists: followedArtistsResult[0]?.count || 0,
    showsAttending: attendance.going,
    showsInterested: attendance.interested,
    totalVotes: votesData.upvotes + votesData.downvotes,
    upvotes: votesData.upvotes,
    downvotes: votesData.downvotes,
    comments: commentsResult[0]?.count || 0,
    reviews: reviewsResult[0]?.count || 0,
    averageRating: reviewsResult[0]?.avgRating || 0,
  };
}

async function getUserRecentActivity(userId: string, limit: number) {
  // Get recent show attendance
  const recentAttendance = await db
    .select({
      type: sql<string>`'attendance'`,
      timestamp: userShowAttendance.createdAt,
      status: userShowAttendance.status,
      showId: userShowAttendance.showId,
      showName: shows.name,
      artistName: artists.name,
    })
    .from(userShowAttendance)
    .innerJoin(shows, eq(userShowAttendance.showId, shows.id))
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .where(eq(userShowAttendance.userId, userId))
    .orderBy(sql`${userShowAttendance.createdAt} DESC`)
    .limit(limit);

  // Get recent artist follows
  const recentFollows = await db
    .select({
      type: sql<string>`'follow'`,
      timestamp: userFollowsArtists.createdAt,
      artistId: userFollowsArtists.artistId,
      artistName: artists.name,
      artistImage: artists.imageUrl,
    })
    .from(userFollowsArtists)
    .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
    .where(eq(userFollowsArtists.userId, userId))
    .orderBy(sql`${userFollowsArtists.createdAt} DESC`)
    .limit(limit);

  // Combine and sort by timestamp
  const allActivity = [...recentAttendance, ...recentFollows]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  return allActivity;
}

async function getUserTopArtists(userId: string, limit: number) {
  const topArtists = await db
    .select({
      artist: artists,
      showCount: sql<number>`COUNT(DISTINCT usa.show_id)`,
    })
    .from(userShowAttendance)
    .innerJoin(shows, eq(userShowAttendance.showId, shows.id))
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .where(
      and(
        eq(userShowAttendance.userId, userId),
        eq(userShowAttendance.status, 'going')
      )
    )
    .groupBy(artists.id)
    .orderBy(sql`COUNT(DISTINCT usa.show_id) DESC`)
    .limit(limit);

  return topArtists;
}

async function getUserAttendanceByMonth(userId: string) {
  const attendance = await db
    .select({
      month: sql<string>`TO_CHAR(s.date, 'YYYY-MM')`,
      count: sql<number>`COUNT(*)`,
    })
    .from(userShowAttendance)
    .innerJoin(shows, eq(userShowAttendance.showId, shows.id))
    .where(
      and(
        eq(userShowAttendance.userId, userId),
        eq(userShowAttendance.status, 'going'),
        gte(shows.date, new Date(new Date().getFullYear() - 1, 0, 1).toISOString())
      )
    )
    .groupBy(sql`TO_CHAR(s.date, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(s.date, 'YYYY-MM')`);

  return attendance;
}