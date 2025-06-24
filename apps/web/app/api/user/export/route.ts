import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { 
  users,
  userFollowsArtists,
  userShowAttendance,
  votes,
  showComments,
  venueReviews,
  emailPreferences,
  artists,
  shows,
  venues
} from '@repo/database';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Collect all user data
    const userData = await collectUserData(user.id);

    // Return as JSON download
    return new NextResponse(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mysetlist-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('User data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}

async function collectUserData(userId: string) {
  // Get user profile
  const [userProfile] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  // Get email preferences
  const [emailPrefs] = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId));

  // Get followed artists
  const followedArtists = await db
    .select({
      artistId: userFollowsArtists.artistId,
      artistName: artists.name,
      followedAt: userFollowsArtists.createdAt,
    })
    .from(userFollowsArtists)
    .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
    .where(eq(userFollowsArtists.userId, userId));

  // Get show attendance
  const showAttendance = await db
    .select({
      showId: userShowAttendance.showId,
      showName: shows.name,
      showDate: shows.date,
      artistName: artists.name,
      venueName: venues.name,
      status: userShowAttendance.status,
      createdAt: userShowAttendance.createdAt,
    })
    .from(userShowAttendance)
    .innerJoin(shows, eq(userShowAttendance.showId, shows.id))
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(userShowAttendance.userId, userId));

  // Get votes
  const userVotes = await db
    .select({
      setlistSongId: votes.setlistSongId,
      voteType: votes.voteType,
      createdAt: votes.createdAt,
    })
    .from(votes)
    .where(eq(votes.userId, userId));

  // Get comments
  const comments = await db
    .select({
      id: showComments.id,
      showId: showComments.showId,
      content: showComments.content,
      createdAt: showComments.createdAt,
    })
    .from(showComments)
    .where(eq(showComments.userId, userId));

  // Get venue reviews
  const reviews = await db
    .select({
      id: venueReviews.id,
      venueId: venueReviews.venueId,
      venueName: venues.name,
      rating: venueReviews.rating,
      content: venueReviews.review,
      createdAt: venueReviews.createdAt,
    })
    .from(venueReviews)
    .leftJoin(venues, eq(venueReviews.venueId, venues.id))
    .where(eq(venueReviews.userId, userId));

  return {
    exportDate: new Date().toISOString(),
    profile: {
      id: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.displayName,
      avatarUrl: userProfile.avatarUrl,
      createdAt: userProfile.createdAt,
      updatedAt: userProfile.updatedAt,
    },
    preferences: {
      email: emailPrefs || null,
    },
    followedArtists: followedArtists.map(f => ({
      artistId: f.artistId,
      artistName: f.artistName,
      followedAt: f.followedAt,
    })),
    showAttendance: showAttendance.map(a => ({
      showId: a.showId,
      showName: a.showName,
      showDate: a.showDate,
      artistName: a.artistName,
      venueName: a.venueName,
      status: a.status,
      addedAt: a.createdAt,
    })),
    votes: userVotes.map(v => ({
      setlistSongId: v.setlistSongId,
      voteType: v.voteType,
      votedAt: v.createdAt,
    })),
    comments: comments.map(c => ({
      id: c.id,
      showId: c.showId,
      content: c.content,
      postedAt: c.createdAt,
    })),
    venueReviews: reviews.map(r => ({
      id: r.id,
      venueId: r.venueId,
      venueName: r.venueName,
      rating: r.rating,
      content: r.content,
      postedAt: r.createdAt,
    })),
  };
}