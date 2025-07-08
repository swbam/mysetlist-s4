import { BreadcrumbNavigation } from '@/components/breadcrumb-navigation';
import { ArtistErrorBoundary } from '@/components/error-boundaries/artist-error-boundary';
import { createArtistMetadata } from '@/lib/seo-metadata';
import { getUser } from '@repo/auth/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import {
  getArtist,
  getArtistShows,
  getArtistStats,
  getSimilarArtists,
} from './actions';
import { ArtistHeader } from './components/artist-header';
import { ArtistPageWrapper } from './components/artist-page-wrapper';
import { ArtistStats } from './components/artist-stats';
import { UpcomingShows } from './components/upcoming-shows';

// Dynamic imports for tab content to optimize initial bundle
const ArtistBio = dynamic(
  () =>
    import('./components/artist-bio').then((mod) => ({
      default: mod.ArtistBio,
    })),
  {
    loading: () => <div className="h-32 animate-pulse rounded-lg bg-muted" />,
  }
);

const ArtistSongCatalog = dynamic(
  () =>
    import('./components/artist-song-catalog').then((mod) => ({
      default: mod.ArtistSongCatalog,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-muted" />,
  }
);

const ArtistTopTracks = dynamic(
  () =>
    import('./components/artist-top-tracks').then((mod) => ({
      default: mod.ArtistTopTracks,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-muted" />,
  }
);

const PastShows = dynamic(
  () =>
    import('./components/past-shows').then((mod) => ({
      default: mod.PastShows,
    })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
  }
);

const SimilarArtists = dynamic(
  () =>
    import('./components/similar-artists').then((mod) => ({
      default: mod.SimilarArtists,
    })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
  }
);

type ArtistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Configure ISR with revalidation
export const revalidate = 3600; // Revalidate every hour
export const dynamicParams = true; // Allow dynamic params beyond generateStaticParams

export const generateMetadata = async ({
  params,
}: ArtistPageProps): Promise<Metadata> => {
  const { slug } = await params;

  const artist = await getArtist(slug);

  if (!artist) {
    return createArtistMetadata({
      name: 'Artist Not Found',
      bio: 'The requested artist could not be found.',
      slug: 'not-found',
    });
  }

  return createArtistMetadata({
    name: artist.name,
    bio: artist.bio || undefined,
    imageUrl: artist.imageUrl || undefined,
    slug: artist.slug,
    followerCount: artist.followers || artist.followerCount || undefined,
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

  const breadcrumbItems = [
    { label: 'Artists', href: '/artists' },
    { label: artist.name, isCurrentPage: true },
  ];

  // Transform artist data for components
  const artistData = {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    imageUrl: artist.imageUrl || undefined,
    smallImageUrl: artist.smallImageUrl || undefined,
    genres: artist.genres || '[]',
    popularity: artist.popularity || 0,
    followers: artist.followers || 0,
    verified: artist.verified || false,
    bio: artist.bio || undefined,
    externalUrls: artist.externalUrls || undefined,
    spotifyId: artist.spotifyId || undefined,
  };

  // Transform shows data
  const transformedUpcomingShows = upcomingShows.map(
    ({ show, venue, orderIndex, isHeadliner }) => ({
      show: {
        ...show,
        ticketUrl: show.ticketUrl || undefined,
        status: show.status || 'confirmed',
      },
      venue: venue
        ? {
            id: venue.id,
            name: venue.name,
            city: venue.city,
            state: venue.state || undefined,
            country: venue.country,
          }
        : undefined,
      orderIndex: orderIndex || 0,
      isHeadliner: isHeadliner || false,
    })
  );

  const transformedPastShows = pastShows.map(
    ({ show, venue, orderIndex, isHeadliner }) => ({
      show: {
        ...show,
        ticketUrl: show.ticketUrl || undefined,
        status: show.status || 'completed',
      },
      venue: venue
        ? {
            id: venue.id,
            name: venue.name,
            city: venue.city,
            state: venue.state || undefined,
            country: venue.country,
          }
        : undefined,
      orderIndex: orderIndex || 0,
      isHeadliner: isHeadliner || false,
    })
  );

  return (
    <ArtistErrorBoundary artistName={artist.name}>
      <ArtistPageWrapper
        artistId={artist.id}
        artistName={artist.name}
        spotifyId={artist.spotifyId}
      >
        <div className="container mx-auto py-8">
          {/* Breadcrumb Navigation */}
          <BreadcrumbNavigation items={breadcrumbItems} className="mb-6" />

          {/* Artist Header */}
          <ArtistHeader artist={artistData} />

          {/* Artist Stats */}
          <div className="mt-8">
            <ArtistStats artistId={artist.id} />
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="shows" className="mt-8 w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="shows" aria-label="View upcoming shows">
                Upcoming Shows
              </TabsTrigger>
              <TabsTrigger value="past" aria-label="View past shows">
                Past Shows
              </TabsTrigger>
              <TabsTrigger value="music" aria-label="View artist music">
                Music
              </TabsTrigger>
              <TabsTrigger value="about" aria-label="About the artist">
                About
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shows" className="space-y-4">
              <UpcomingShows
                shows={transformedUpcomingShows}
                artistName={artist.name}
                artistId={artist.id}
              />
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              <PastShows
                shows={transformedPastShows}
                artistName={artist.name}
                artistId={artist.id}
              />
            </TabsContent>

            <TabsContent value="music" className="space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ArtistTopTracks
                  artistId={artist.id}
                  spotifyId={artist.spotifyId}
                />
                <ArtistSongCatalog
                  artistId={artist.id}
                  artistSlug={artist.slug}
                  artistName={artist.name}
                />
              </div>
            </TabsContent>

            <TabsContent value="about" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {artist.bio && <ArtistBio bio={artist.bio} />}
                <SimilarArtists artistId={artist.id} genres={artist.genres} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ArtistPageWrapper>
    </ArtistErrorBoundary>
  );
};

// Generate static params for popular artists
export async function generateStaticParams() {
  try {
    const { db, artists } = await import('@repo/database');
    const { desc, sql } = await import('drizzle-orm');

    // Get top 50 most popular artists for static generation
    const popularArtists = await db
      .select({
        slug: artists.slug,
      })
      .from(artists)
      .where(sql`${artists.popularity} > 0 OR ${artists.trendingScore} > 0`)
      .orderBy(desc(artists.trendingScore), desc(artists.popularity))
      .limit(50);

    return popularArtists.map((artist) => ({
      slug: artist.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for artists:', error);
    return [];
  }
}

export default ArtistPage;
