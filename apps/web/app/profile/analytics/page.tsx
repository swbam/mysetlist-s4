import { db } from '@repo/database';
import { userFollowsArtists, artists, users, userProfiles, userShowAttendance, shows, venues, votes, songs } from '@repo/database/src/schema';
import { eq, desc, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getUser } from '@repo/auth/server';
import { UserAnalyticsDashboard } from './components/user-analytics-dashboard';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function UserAnalyticsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/auth/sign-in');
  }
  
  // Fetch user stats from database
  const [
    userRecord,
    profile,
    attendedShowsData,
    followedArtistsData,
    votesData
  ] = await Promise.all([
    // Get user record
    db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
    
    // Get user profile
    db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1),
    
    // Get attended shows
    db
      .select({
        attendance: userShowAttendance,
        show: shows,
        artist: artists,
        venue: venues,
      })
      .from(userShowAttendance)
      .innerJoin(shows, eq(userShowAttendance.showId, shows.id))
      .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(and(
        eq(userShowAttendance.userId, user.id),
        eq(userShowAttendance.status, 'going')
      ))
      .orderBy(desc(userShowAttendance.createdAt)),
    
    // Get followed artists
    db
      .select({
        follow: userFollowsArtists,
        artist: artists,
      })
      .from(userFollowsArtists)
      .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
      .where(eq(userFollowsArtists.userId, user.id))
      .orderBy(desc(userFollowsArtists.createdAt)),
    
    // Get votes
    db
      .select({
        vote: votes,
        song: songs,
        show: shows,
      })
      .from(votes)
      .innerJoin(songs, eq(votes.songId, songs.id))
      .innerJoin(shows, eq(votes.showId, shows.id))
      .where(eq(votes.userId, user.id))
      .orderBy(desc(votes.createdAt))
  ]);
  
  const stats = {
    showsAttended: attendedShowsData.length,
    artistsFollowed: followedArtistsData.length,
    votesCast: votesData.length,
    memberSince: userRecord[0]?.createdAt || new Date(),
    concertCount: profile[0]?.concertCount || 0,
  };

  // Calculate genre distribution from followed artists
  const genreMap = new Map<string, number>();
  followedArtistsData.forEach(({ artist }) => {
    if (artist.genres) {
      const genres = JSON.parse(artist.genres);
      genres.forEach((genre: string) => {
        genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
      });
    }
  });

  const topGenres = Array.from(genreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  // Calculate monthly show attendance
  const monthlyAttendance = new Map<string, number>();
  attendedShowsData.forEach(({ show }) => {
    const month = new Date(show.date).toISOString().slice(0, 7);
    monthlyAttendance.set(month, (monthlyAttendance.get(month) || 0) + 1);
  });

  const attendanceByMonth = Array.from(monthlyAttendance.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Your Music Analytics</h1>
      
      <UserAnalyticsDashboard
        stats={stats}
        attendedShows={attendedShowsData}
        followedArtists={followedArtistsData}
        votes={votesData}
        topGenres={topGenres}
        attendanceByMonth={attendanceByMonth}
      />
    </div>
  );
}