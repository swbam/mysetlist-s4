'use server';

import { db } from '@repo/database';
import { venues, shows, venueReviews, venuePhotos, venueInsiderTips, artists, users } from '@repo/database/src/schema';
import { eq, desc, gte, lte, and, ne, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export const getVenueBySlug = unstable_cache(
  async (slug: string) => {
    const [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.slug, slug))
      .limit(1);

    return venue || null;
  },
  ['venue-by-slug'],
  { revalidate: 3600 } // Cache for 1 hour
);

export const getVenueShows = unstable_cache(
  async (venueId: string, type: 'upcoming' | 'past' = 'upcoming', limit = 20) => {
    const now = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const condition = type === 'upcoming' 
      ? gte(shows.date, now)
      : lte(shows.date, now);

    const venueShows = await db
      .select({
        id: shows.id,
        name: shows.name,
        date: shows.date,
        ticketUrl: shows.ticketUrl,
        artist: {
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          imageUrl: artists.imageUrl,
          genres: artists.genres,
        },
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .where(and(eq(shows.venueId, venueId), condition))
      .orderBy(type === 'upcoming' ? shows.date : desc(shows.date))
      .limit(limit);

    return venueShows;
  },
  ['venue-shows'],
  { revalidate: 300 } // Cache for 5 minutes
);

export const getVenueReviews = unstable_cache(
  async (venueId: string, limit = 50) => {
    const reviews = await db
      .select({
        id: venueReviews.id,
        rating: venueReviews.rating,
        review: venueReviews.review,
        acoustics: venueReviews.acoustics,
        accessibility: venueReviews.accessibility,
        sightlines: venueReviews.sightlines,
        parkingEase: venueReviews.parkingEase,
        concessions: venueReviews.concessions,
        visitedAt: venueReviews.visitedAt,
        helpful: venueReviews.helpful,
        createdAt: venueReviews.createdAt,
        user: {
          id: users.id,
          name: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(venueReviews)
      .innerJoin(users, eq(venueReviews.userId, users.id))
      .where(eq(venueReviews.venueId, venueId))
      .orderBy(desc(venueReviews.helpful), desc(venueReviews.createdAt))
      .limit(limit);

    return reviews;
  },
  ['venue-reviews'],
  { revalidate: 300 }
);

export const getVenuePhotos = unstable_cache(
  async (venueId: string, limit = 50) => {
    const photos = await db
      .select({
        id: venuePhotos.id,
        imageUrl: venuePhotos.imageUrl,
        caption: venuePhotos.caption,
        photoType: venuePhotos.photoType,
        createdAt: venuePhotos.createdAt,
        user: {
          id: users.id,
          name: users.displayName,
        },
      })
      .from(venuePhotos)
      .innerJoin(users, eq(venuePhotos.userId, users.id))
      .where(eq(venuePhotos.venueId, venueId))
      .orderBy(desc(venuePhotos.createdAt))
      .limit(limit);

    return photos;
  },
  ['venue-photos'],
  { revalidate: 300 }
);

export const getVenueInsiderTips = unstable_cache(
  async (venueId: string, limit = 50) => {
    const tips = await db
      .select({
        id: venueInsiderTips.id,
        tipCategory: venueInsiderTips.tipCategory,
        tip: venueInsiderTips.tip,
        helpful: venueInsiderTips.helpful,
        createdAt: venueInsiderTips.createdAt,
        user: {
          id: users.id,
          name: users.displayName,
        },
      })
      .from(venueInsiderTips)
      .innerJoin(users, eq(venueInsiderTips.userId, users.id))
      .where(eq(venueInsiderTips.venueId, venueId))
      .orderBy(desc(venueInsiderTips.helpful), desc(venueInsiderTips.createdAt))
      .limit(limit);

    return tips;
  },
  ['venue-tips'],
  { revalidate: 300 }
);

export const getNearbyVenues = unstable_cache(
  async (currentVenueId: string, latitude: number | null, longitude: number | null, radiusKm = 10, limit = 6) => {
    if (!latitude || !longitude) return [];

    // Calculate distance using Haversine formula in SQL
    const nearbyVenues = await db
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        address: venues.address,
        city: venues.city,
        state: venues.state,
        country: venues.country,
        imageUrl: venues.imageUrl,
        capacity: venues.capacity,
        venueType: venues.venueType,
        distance: sql<number>`
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(${venues.latitude})) *
            cos(radians(${venues.longitude}) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(${venues.latitude}))
          )
        `.as('distance'),
      })
      .from(venues)
      .where(
        and(
          ne(venues.id, currentVenueId),
          sql`${venues.latitude} IS NOT NULL`,
          sql`${venues.longitude} IS NOT NULL`,
          sql`
            6371 * acos(
              cos(radians(${latitude})) * cos(radians(${venues.latitude})) *
              cos(radians(${venues.longitude}) - radians(${longitude})) +
              sin(radians(${latitude})) * sin(radians(${venues.latitude}))
            ) <= ${radiusKm}
          `
        )
      )
      .orderBy(sql`distance`)
      .limit(limit);

    return nearbyVenues;
  },
  ['nearby-venues'],
  { revalidate: 3600 }
);

// Actions for adding reviews, photos, and tips
export async function addVenueReview(
  venueId: string,
  userId: string,
  data: {
    rating: number;
    review: string;
    acoustics?: number;
    accessibility?: number;
    sightlines?: number;
    parkingEase?: number;
    concessions?: number;
    visitedAt: Date;
  }
) {
  try {
    const [newReview] = await db
      .insert(venueReviews)
      .values({
        venueId,
        userId,
        ...data,
      })
      .returning();

    return { success: true, review: newReview };
  } catch (error) {
    console.error('Error adding venue review:', error);
    return { success: false, error: 'Failed to add review' };
  }
}

export async function addVenuePhoto(
  venueId: string,
  userId: string,
  data: {
    imageUrl: string;
    caption?: string;
    photoType?: string;
  }
) {
  try {
    const [newPhoto] = await db
      .insert(venuePhotos)
      .values({
        venueId,
        userId,
        ...data,
      })
      .returning();

    return { success: true, photo: newPhoto };
  } catch (error) {
    console.error('Error adding venue photo:', error);
    return { success: false, error: 'Failed to add photo' };
  }
}

export async function addInsiderTip(
  venueId: string,
  userId: string,
  data: {
    tipCategory: string;
    tip: string;
  }
) {
  try {
    const [newTip] = await db
      .insert(venueInsiderTips)
      .values({
        venueId,
        userId,
        ...data,
      })
      .returning();

    return { success: true, tip: newTip };
  } catch (error) {
    console.error('Error adding insider tip:', error);
    return { success: false, error: 'Failed to add tip' };
  }
}

export async function markReviewHelpful(reviewId: string) {
  try {
    await db
      .update(venueReviews)
      .set({ helpful: sql`${venueReviews.helpful} + 1` })
      .where(eq(venueReviews.id, reviewId));

    return { success: true };
  } catch (error) {
    console.error('Error marking review helpful:', error);
    return { success: false, error: 'Failed to update review' };
  }
}

export async function markTipHelpful(tipId: string) {
  try {
    await db
      .update(venueInsiderTips)
      .set({ helpful: sql`${venueInsiderTips.helpful} + 1` })
      .where(eq(venueInsiderTips.id, tipId));

    return { success: true };
  } catch (error) {
    console.error('Error marking tip helpful:', error);
    return { success: false, error: 'Failed to update tip' };
  }
}