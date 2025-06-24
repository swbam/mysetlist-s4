import { db } from '@repo/database';
import { userFollowsArtists, artists, shows } from '@repo/database/src/schema';
import { eq, desc, gte, and } from 'drizzle-orm';
import { getUser } from '@repo/auth/server';
import { redirect } from 'next/navigation';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Music, Calendar, MapPin, Heart } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { FollowButton } from '@/app/artists/[slug]/components/follow-button';

export const metadata: Metadata = createMetadata({
  title: 'Following - MySetlist',
  description: 'Artists you follow and their upcoming shows',
});

export default async function FollowingPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Get all artists the user follows
  const followedArtists = await db
    .select({
      artist: artists,
      followedAt: userFollowsArtists.createdAt,
    })
    .from(userFollowsArtists)
    .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
    .where(eq(userFollowsArtists.userId, user.id))
    .orderBy(desc(userFollowsArtists.createdAt));

  // Get upcoming shows for followed artists (next 30 days)
  const artistIds = followedArtists.map(f => f.artist.id);
  const upcomingShows = artistIds.length > 0 
    ? await db
        .select({
          show: shows,
          artist: artists,
        })
        .from(shows)
        .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
        .where(
          and(
            eq(shows.headlinerArtistId, artists.id),
            gte(shows.date, new Date()),
            shows.date <= addDays(new Date(), 30)
          )
        )
        .orderBy(shows.date)
    : [];

  const groupedShows = upcomingShows.reduce((acc, { show, artist }) => {
    if (!acc[artist.id]) {
      acc[artist.id] = {
        artist,
        shows: [],
      };
    }
    acc[artist.id].shows.push(show);
    return acc;
  }, {} as Record<string, { artist: typeof artists.$inferSelect; shows: typeof shows.$inferSelect[] }>);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Artists You Follow</h1>
        <p className="text-muted-foreground">
          Stay updated with your favorite artists' shows and setlists
        </p>
      </div>

      <Tabs defaultValue="artists" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="artists">Following ({followedArtists.length})</TabsTrigger>
          <TabsTrigger value="shows">Upcoming Shows ({upcomingShows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="artists" className="space-y-4 mt-6">
          {followedArtists.length > 0 ? (
            followedArtists.map(({ artist, followedAt }) => (
              <Card key={artist.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <Link 
                      href={`/artists/${artist.slug}`}
                      className="relative w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0"
                    >
                      {artist.imageUrl ? (
                        <Image
                          src={artist.smallImageUrl || artist.imageUrl}
                          alt={artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Music className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/artists/${artist.slug}`}
                        className="font-semibold text-lg hover:underline block truncate"
                      >
                        {artist.name}
                      </Link>
                      {artist.genres && (
                        <div className="flex gap-1 mt-1">
                          {JSON.parse(artist.genres).slice(0, 2).map((genre: string) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Following since {format(new Date(followedAt), 'MMM d, yyyy')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <FollowButton
                        artistId={artist.id}
                        artistName={artist.name}
                        initialFollowing={true}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/artists/${artist.slug}`}>
                          View Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No artists followed yet</h3>
              <p className="text-muted-foreground mb-4">
                Start following artists to see their upcoming shows here
              </p>
              <Button asChild>
                <Link href="/artists">Discover Artists</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="shows" className="space-y-4 mt-6">
          {upcomingShows.length > 0 ? (
            Object.values(groupedShows).map(({ artist, shows }) => (
              <div key={artist.id} className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Link href={`/artists/${artist.slug}`} className="hover:underline">
                    {artist.name}
                  </Link>
                  <Badge variant="outline">{shows.length} shows</Badge>
                </h3>
                {shows.map(show => (
                  <Card key={show.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-medium">{show.name}</h4>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(show.date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {show.location}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/shows/${show.slug}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No upcoming shows</h3>
              <p className="text-muted-foreground">
                None of your followed artists have shows in the next 30 days
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}