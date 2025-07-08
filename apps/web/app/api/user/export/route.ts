import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import {
  artists,
  emailPreferences,
  shows,
  userShowAttendance,
  users,
  venueReviews,
  venues,
  votes,
} from '@repo/database';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

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
      createdAt: userProfile.createdAt,
      updatedAt: userProfile.updatedAt,
    },
    preferences: {
      email: emailPrefs || null,
    },
    showAttendance: showAttendance.map((a) => ({
      showId: a.showId,
      showName: a.showName,
      showDate: a.showDate,
      artistName: a.artistName,
      venueName: a.venueName,
      status: a.status,
      addedAt: a.createdAt,
    })),
    votes: userVotes.map((v) => ({
      setlistSongId: v.setlistSongId,
      voteType: v.voteType,
      votedAt: v.createdAt,
    })),
    venueReviews: reviews.map((r) => ({
      id: r.id,
      venueId: r.venueId,
      venueName: r.venueName,
      rating: r.rating,
      content: r.content,
      postedAt: r.createdAt,
    })),
  };
}
