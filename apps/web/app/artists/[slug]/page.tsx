import { db, artists, shows, venues, artistStats, userFollowsArtists } from '@repo/database';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Badge } from '@repo/design-system';
import { Button } from '@repo/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system';
import { Music, MapPin, Calendar, Users, ExternalLink, Heart } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { getUser } from '@repo/auth/server';
import { FollowButton } from './components/follow-button';
import { FollowerCount } from './components/follower-count';


type ArtistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: ArtistPageProps): Promise<Metadata> => {
  const { slug } = await params;
  
  const artist = await db
    .select({
      name: artists.name,
      bio: artists.bio,
      imageUrl: artists.imageUrl,
    })
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);

  if (artist.length === 0) {
    return createMetadata({
      title: 'Artist Not Found - MySetlist',
      description: 'The requested artist could not be found.',
    });
  }

  return createMetadata({
    title: `${artist[0].name} - MySetlist`,
    description: artist[0].bio || `Discover upcoming shows and setlists for ${artist[0].name}`,
    image: artist[0].imageUrl || undefined,
  });
};

const ArtistPage = async ({ params }: ArtistPageProps) => {
  const { slug } = await params;
  const user = await getUser();

  // Fetch artist with stats
  const artistQuery = await db
    .select({
      artist: artists,
      stats: artistStats,
    })
    .from(artists)
    .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
    .where(eq(artists.slug, slug))
    .limit(1);

  if (artistQuery.length === 0) {
    notFound();
  }

  const { artist, stats } = artistQuery[0];

  // Fetch upcoming shows
  const upcomingShows = await db
    .select({
      show: shows,
      venue: venues,
    })
    .from(shows)
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.headlinerArtistId, artist.id))
    .orderBy(shows.date)
    .limit(10);

  // Check if user follows this artist
  let isFollowing = false;
  if (user) {
    const followRecord = await db
      .select()
      .from(userFollowsArtists)
      .where(and(
        eq(userFollowsArtists.userId, user.id),
        eq(userFollowsArtists.artistId, artist.id)
      ))
      .limit(1);
    
    isFollowing = followRecord.length > 0;
  }

  const genres = artist.genres ? JSON.parse(artist.genres) : [];

  return (
    <div className="container mx-auto py-8">
      {/* Artist Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="relative w-full md:w-64 h-64 rounded-lg overflow-hidden bg-muted">
          {artist.imageUrl ? (
            <Image
              src={artist.imageUrl}
              alt={artist.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Music className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{artist.name}</h1>
              {artist.verified && (
                <Badge variant="secondary" className="mb-4">
                  ✓ Verified Artist
                </Badge>
              )}
            </div>
            
            {userId && (
              <FollowButton
                artistId={artist.id}
                artistName={artist.name}
              />
            )}
          </div>

          {/* Followers */}
          <div className="mb-6">
            <FollowerCount artistId={artist.id} />
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {genres.slice(0, 5).map((genre: string) => (
                <Badge key={genre} variant="outline">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {/* Bio */}
          {artist.bio && (
            <p className="text-muted-foreground leading-relaxed">
              {artist.bio}
            </p>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shows">Upcoming Shows</TabsTrigger>
          <TabsTrigger value="setlists">Recent Setlists</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="shows" className="space-y-4">
          {upcomingShows.length > 0 ? (
            upcomingShows.map(({ show, venue }) => (
              <Card key={show.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{show.name}</h3>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {venue ? `${venue.name}, ${venue.city}` : 'Venue TBA'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(show.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/shows/${show.slug}`}>
                          View Details
                        </Link>
                      </Button>
                      {show.ticketUrl && (
                        <Button size="sm" asChild>
                          <a href={show.ticketUrl} target="_blank" rel="noopener noreferrer">
                            Get Tickets
                            <ExternalLink className="h-4 w-4 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No upcoming shows</h3>
              <p className="text-muted-foreground">
                Check back later for new tour announcements!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="setlists" className="space-y-4">
          <div className="text-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Recent setlists coming soon</h3>
            <p className="text-muted-foreground">
              We're working on displaying recent setlists for {artist.name}.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Artist Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {artist.bio && (
                <div>
                  <h4 className="font-semibold mb-2">Biography</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {artist.bio}
                  </p>
                </div>
              )}
              
              {genres.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre: string) => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArtistPage;