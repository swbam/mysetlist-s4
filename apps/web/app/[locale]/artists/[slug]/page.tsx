import { getDictionary } from '@repo/internationalization';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtistHeader } from './components/artist-header';
import { ArtistBio } from './components/artist-bio';
import { ArtistTopTracks } from './components/artist-top-tracks';
import { SimilarArtists } from './components/similar-artists';
import { UpcomingShows } from './components/upcoming-shows';
import { PastShows } from './components/past-shows';
import { ArtistStats } from './components/artist-stats';
import { getArtist, getArtistShows, getArtistStats } from './actions';

type ArtistPageProps = {
  params: Promise<{
    locale: string;
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
      title: 'Artist Not Found - TheSet',
      description: 'The artist you are looking for could not be found.',
    });
  }
  
  return createMetadata({
    title: `${artist.name} - TheSet`,
    description: `Discover ${artist.name}'s upcoming shows, setlists, and top tracks. Follow ${artist.name} to never miss a concert.`,
    openGraph: {
      images: artist.imageUrl ? [artist.imageUrl] : undefined,
    },
  });
};

const ArtistPage = async ({ params }: ArtistPageProps) => {
  const { locale, slug } = await params;
  const dictionary = await getDictionary(locale);

  const artist = await getArtist(slug);
  
  if (!artist) {
    notFound();
  }

  const [upcomingShows, pastShows, stats] = await Promise.all([
    getArtistShows(artist.id, 'upcoming'),
    getArtistShows(artist.id, 'past'),
    getArtistStats(artist.id),
  ]);

  return (
    <div className="flex flex-col">
      <ArtistHeader artist={{
        ...artist,
        verified: artist.verified ?? false
      }} />
      
      <div className="container mx-auto flex flex-col gap-12 py-8">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-12">
            {artist.bio && <ArtistBio bio={artist.bio} />}
            
            <UpcomingShows shows={upcomingShows} artistName={artist.name} />
            
            <ArtistTopTracks 
              artistId={artist.id} 
              spotifyId={artist.spotifyId}
            />
            
            <PastShows shows={pastShows} artistName={artist.name} />
          </div>
          
          <aside className="flex flex-col gap-8">
            <ArtistStats stats={stats ? {
              ...stats,
              lastShowDate: stats.lastShowDate?.toISOString() ?? null
            } : null} />
            
            <SimilarArtists 
              artistId={artist.id}
              genres={artist.genres}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ArtistPage;