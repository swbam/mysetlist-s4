import { notFound } from 'next/navigation';
import { createVenueMetadata } from '@/lib/seo-metadata';
import type { Metadata } from 'next';
import { getVenueBySlug, getVenueShows, getVenueReviews, getVenuePhotos, getVenueInsiderTips, getNearbyVenues } from './actions';
import { VenueHeader } from './components/venue-header';
import { VenueDetails } from './components/venue-details';
import { UpcomingShows } from './components/upcoming-shows';
import { PastShows } from './components/past-shows';
import { BreadcrumbNavigation } from '@/components/breadcrumb-navigation';
import { VenueReviews } from './components/venue-reviews';
import { VenuePhotos } from './components/venue-photos';
import { InsiderTips } from './components/insider-tips';
import { NearbyVenues } from './components/nearby-venues';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';

type VenuePageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: VenuePageProps): Promise<Metadata> => {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  
  if (!venue) {
    return createVenueMetadata({
      name: 'Venue Not Found',
      city: 'Unknown',
      slug: 'not-found',
      description: 'The venue you are looking for does not exist.',
    });
  }

  return createVenueMetadata({
    name: venue.name,
    city: venue.city,
    state: venue.state,
    country: venue.country,
    description: venue.description,
    imageUrl: venue.imageUrl,
    slug: venue.slug,
    upcomingShowCount: venue.upcomingShowCount,
    capacity: venue.capacity,
  });
};

const VenuePage = async ({ params }: VenuePageProps) => {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  if (!venue) {
    notFound();
  }

  // Fetch all venue data in parallel
  const [upcomingShows, pastShows, reviews, photos, insiderTips, nearbyVenues] = await Promise.all([
    getVenueShows(venue.id, 'upcoming'),
    getVenueShows(venue.id, 'past'),
    getVenueReviews(venue.id),
    getVenuePhotos(venue.id),
    getVenueInsiderTips(venue.id),
    getNearbyVenues(venue.id, venue.latitude, venue.longitude),
  ]);

  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : null;

  const breadcrumbItems = [
    { label: 'Venues', href: '/venues' },
    { label: venue.name, isCurrentPage: true },
  ];

  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <BreadcrumbNavigation items={breadcrumbItems} className="mb-6" />
        <div className="flex flex-col gap-8">
          {/* Venue Header */}
          <VenueHeader 
            venue={venue} 
            avgRating={avgRating}
            reviewCount={reviews.length}
            upcomingShowCount={upcomingShows.length}
          />

          {/* Venue Details */}
          <VenueDetails venue={venue} />

          {/* Main Content Tabs */}
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="upcoming">Upcoming Shows</TabsTrigger>
              <TabsTrigger value="past">Past Shows</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="tips">Insider Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              <UpcomingShows shows={upcomingShows.map(show => ({
                ...show,
                date: new Date(show.date)
              }))} venueId={venue.id} />
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              <PastShows shows={pastShows.map(show => ({
                ...show,
                date: new Date(show.date)
              }))} venueId={venue.id} />
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <VenueReviews 
                reviews={reviews.map(review => ({
                  ...review,
                  helpful: review.helpful || 0
                }))} 
                venueId={venue.id}
                avgRating={avgRating}
              />
            </TabsContent>

            <TabsContent value="photos" className="space-y-4">
              <VenuePhotos photos={photos} venueId={venue.id} venueName={venue.name} />
            </TabsContent>

            <TabsContent value="tips" className="space-y-4">
              <InsiderTips tips={insiderTips.map(tip => ({
                ...tip,
                helpful: tip.helpful || 0
              }))} venueId={venue.id} />
            </TabsContent>
          </Tabs>

          {/* Nearby Venues */}
          {nearbyVenues.length > 0 && (
            <NearbyVenues venues={nearbyVenues} currentVenueId={venue.id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default VenuePage;