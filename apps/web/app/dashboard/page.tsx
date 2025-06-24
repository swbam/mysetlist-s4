import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@repo/database';
import { artists, shows, venues, userFollowsArtists, userShowAttendance, setlists, votes } from '@repo/database/src/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Calendar, Music, TrendingUp, Users, Heart, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/sign-in');
  }

  // Fetch user's personalized data
  const [
    followedArtistsData,
    upcomingShowsData,
    recentVotesData,
    userStatsData
  ] = await Promise.all([
    // Followed artists with upcoming shows
    db
      .select({
        artist: artists,
        upcomingShowCount: sql<number>`(
          SELECT COUNT(*)
          FROM shows s
          WHERE s.headliner_artist_id = ${artists.id}
          AND s.date >= CURRENT_DATE
        )`
      })
      .from(userFollowsArtists)
      .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
      .where(eq(userFollowsArtists.userId, user.id))
      .orderBy(desc(sql`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.headliner_artist_id = ${artists.id}
        AND s.date >= CURRENT_DATE
      )`))
      .limit(6),

    // Upcoming shows in user's area or from followed artists
    db
      .select({
        show: shows,
        artist: artists,
        venue: venues,
        isFollowing: sql<boolean>`EXISTS(
          SELECT 1 FROM user_follows_artists ufa
          WHERE ufa.user_id = ${user.id}
          AND ufa.artist_id = ${shows.headlinerArtistId}
        )`
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(gte(shows.date, new Date().toISOString()))
      .orderBy(shows.date)
      .limit(8),

    // Recent votes by user
    db
      .select({
        vote: votes,
        song: sql<any>`s.title`,
        artist: sql<any>`a.name`,
        showName: sql<any>`sh.name`
      })
      .from(votes)
      .where(eq(votes.userId, user.id))
      .orderBy(desc(votes.createdAt))
      .limit(5),

    // User stats
    Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(userFollowsArtists).where(eq(userFollowsArtists.userId, user.id)),
      db.select({ count: sql<number>`COUNT(*)` }).from(userShowAttendance).where(eq(userShowAttendance.userId, user.id)),
      db.select({ count: sql<number>`COUNT(*)` }).from(votes).where(eq(votes.userId, user.id))
    ])
  ]);

  const stats = {
    followedArtists: userStatsData[0][0]?.count || 0,
    attendedShows: userStatsData[1][0]?.count || 0,
    votesCast: userStatsData[2][0]?.count || 0
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's what's happening in your music world
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/search">
              <Search className="h-4 w-4 mr-2" />
              Discover
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/artists">
              <Plus className="h-4 w-4 mr-2" />
              Follow Artists
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Artists Following</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.followedArtists}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/profile/artists" className="text-primary hover:underline">
                Manage your artists
              </Link>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shows Attended</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendedShows}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/profile/shows" className="text-primary hover:underline">
                View your history
              </Link>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votes Cast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.votesCast}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/profile/activity" className="text-primary hover:underline">
                See your impact
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Followed Artists */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Your Artists
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/profile/artists">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {followedArtistsData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No artists followed yet</p>
                <Button asChild size="sm">
                  <Link href="/artists">
                    <Plus className="h-4 w-4 mr-2" />
                    Discover Artists
                  </Link>
                </Button>
              </div>
            ) : (
              followedArtistsData.map(({ artist, upcomingShowCount }) => (
                <div key={artist.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {artist.imageUrl && (
                      <img 
                        src={artist.imageUrl} 
                        alt={artist.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <Link href={`/artists/${artist.slug}`} className="font-medium hover:text-primary">
                        {artist.name}
                      </Link>
                      {artist.genres && (
                        <p className="text-sm text-muted-foreground">
                          {JSON.parse(artist.genres as string).slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {upcomingShowCount > 0 && (
                    <Badge variant="secondary">
                      {upcomingShowCount} upcoming
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Shows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Shows
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/discover">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingShowsData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No upcoming shows</p>
                <Button asChild size="sm">
                  <Link href="/discover">
                    <Search className="h-4 w-4 mr-2" />
                    Find Shows
                  </Link>
                </Button>
              </div>
            ) : (
              upcomingShowsData.slice(0, 4).map(({ show, artist, venue, isFollowing }) => (
                <div key={show.id} className="p-3 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/shows/${show.slug}`} className="font-medium hover:text-primary">
                      {artist.name}
                    </Link>
                    {isFollowing && (
                      <Badge variant="outline" className="text-xs">
                        <Heart className="h-3 w-3 mr-1 fill-current" />
                        Following
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{format(new Date(show.date), 'PPP p')}</p>
                    {venue && (
                      <p className="flex items-center gap-1">
                        <span>{venue.name}</span>
                        <span>•</span>
                        <span>{venue.city}, {venue.state}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentVotesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentVotesData.map((vote, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground">
                    You voted on <span className="font-medium">{vote.song}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/search">
                <Search className="h-6 w-6 mb-2" />
                Search
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/artists">
                <Users className="h-6 w-6 mb-2" />
                Browse Artists
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/discover">
                <Calendar className="h-6 w-6 mb-2" />
                Find Shows
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/profile">
                <TrendingUp className="h-6 w-6 mb-2" />
                Your Stats
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 