import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { EnhancedSetlistViewer } from './components/enhanced-setlist-viewer';
import { ShowInfo } from './components/show-info';
import { RealtimeActivityFeed } from '@/components/realtime-activity-feed';
import { db } from '@repo/database';
import { shows, artists, venues, setlists, setlistSongs, songs } from '@repo/database/src/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

type SetlistPageProps = {
  params: Promise<{
    showId: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: SetlistPageProps): Promise<Metadata> => {
  const { showId } = await params;
  
  // Fetch show details for metadata
  const show = await db
    .select({
      id: shows.id,
      name: shows.name,
      artist: artists.name,
      venue: venues.name,
    })
    .from(shows)
    .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.id, showId))
    .limit(1);

  if (show.length === 0) {
    return createMetadata({
      title: 'Show Not Found - MySetlist',
      description: 'The requested show could not be found.',
    });
  }

  return createMetadata({
    title: `${show[0].artist} at ${show[0].venue} - MySetlist`,
    description: `Live setlist and voting for ${show[0].artist} at ${show[0].venue}`,
  });
};

const SetlistPage = async ({ params }: SetlistPageProps) => {
  const { showId } = await params;

  // Fetch show data with setlists
  const show = await db
    .select({
      shows: {
        id: shows.id,
        name: shows.name,
        date: shows.date,
        status: shows.status,
        attendeeCount: shows.attendeeCount,
      },
      artists: {
        id: artists.id,
        name: artists.name,
        imageUrl: artists.imageUrl,
      },
      venues: {
        id: venues.id,
        name: venues.name,
        city: venues.city,
        country: venues.country,
        capacity: venues.capacity,
      },
    })
    .from(shows)
    .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.id, showId))
    .limit(1);

  if (show.length === 0) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <ShowInfo showId={showId} show={show[0]} />
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <EnhancedSetlistViewer showId={showId} />
          </div>
          
          <div className="lg:col-span-1">
            <RealtimeActivityFeed showId={showId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetlistPage;