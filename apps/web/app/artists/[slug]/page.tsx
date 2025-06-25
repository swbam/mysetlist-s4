import { notFound } from 'next/navigation';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system';
import { getUser } from '@repo/auth/server';
import { ArtistHeader } from './components/artist-header';
import { UpcomingShows } from './components/upcoming-shows';
import { PastShows } from './components/past-shows';
import { ArtistTopTracks } from './components/artist-top-tracks';
import { ArtistStats } from './components/artist-stats';
import { SimilarArtists } from './components/similar-artists';
import { getArtist, getArtistShows, getArtistStats, getSimilarArtists } from './actions';


type ArtistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: ArtistPageProps): Promise<Metadata> => {
  const { slug } = await params;
  
  const artist = await getArtist(slug);

  if (!artist) {
    return createMetadata({
      title: 'Artist Not Found - MySetlist',
      description: 'The requested artist could not be found.',
    });
  }

  return createMetadata({
    title: `${artist.name} - MySetlist`,
    description: artist.bio || `Discover upcoming shows and setlists for ${artist.name}`,
    image: artist.imageUrl || undefined,
  });
};

const ArtistPage = async ({ params }: ArtistPageProps) => {
  const { slug } = await params;
  const user = await getUser();

  // Fetch artist data
  const artist = await getArtist(slug);
  
  if (!artist) {
    notFound();
  }

  // Fetch all related data in parallel
  const [upcomingShows, pastShows, stats, similarArtists] = await Promise.all([
    getArtistShows(artist.id, 'upcoming'),
    getArtistShows(artist.id, 'past'),
    getArtistStats(artist.id),
    getSimilarArtists(artist.id, artist.genres),
  ]);

  return (
    <div className="container mx-auto py-8">
      {/* Artist Header */}
      <ArtistHeader artist={artist} />

      {/* Artist Stats */}
      <div className="mt-8">
        <ArtistStats artistId={artist.id} />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="shows" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shows">Upcoming Shows</TabsTrigger>
          <TabsTrigger value="past">Past Shows</TabsTrigger>
          <TabsTrigger value="music">Music</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="shows" className="space-y-4">
          <UpcomingShows shows={upcomingShows} artistName={artist.name} />
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <PastShows shows={pastShows} artistName={artist.name} />
        </TabsContent>

        <TabsContent value="music" className="space-y-4">
          <ArtistTopTracks artistId={artist.id} spotifyId={artist.spotifyId} />
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimilarArtists artistId={artist.id} genres={artist.genres} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArtistPage;