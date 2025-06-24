import { db } from '../client';
import { venues, shows, venueReviews, users } from '../schema';
import { eq, sql, desc, asc, and, or, ilike, gte } from 'drizzle-orm';

export async function getVenueById(venueId: string) {
  const result = await db
    .select({
      venue: venues,
      showCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
      )`,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
        AND s.date >= CURRENT_DATE
      )`,
      reviewCount: sql<number>`(
        SELECT COUNT(*)
        FROM venue_reviews vr
        WHERE vr.venue_id = ${venues.id}
      )`,
      averageRating: sql<number>`(
        SELECT AVG(vr.rating)::numeric(3,2)
        FROM venue_reviews vr
        WHERE vr.venue_id = ${venues.id}
      )`
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);

  return result[0] || null;
}

export async function getVenueBySlug(slug: string) {
  const result = await db
    .select({
      venue: venues,
      showCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
      )`,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
        AND s.date >= CURRENT_DATE
      )`,
      reviewCount: sql<number>`(
        SELECT COUNT(*)
        FROM venue_reviews vr
        WHERE vr.venue_id = ${venues.id}
      )`,
      averageRating: sql<number>`(
        SELECT AVG(vr.rating)::numeric(3,2)
        FROM venue_reviews vr
        WHERE vr.venue_id = ${venues.id}
      )`
    })
    .from(venues)
    .where(eq(venues.slug, slug))
    .limit(1);

  return result[0] || null;
}

export async function searchVenues(query: string, options?: {
  limit?: number;
  city?: string;
  state?: string;
}) {
  const { limit = 20, city, state } = options || {};

  let searchQuery = db
    .select({
      venue: venues,
      showCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
      )`,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
        AND s.date >= CURRENT_DATE
      )`
    })
    .from(venues);

  const conditions = [
    or(
      ilike(venues.name, `%${query}%`),
      ilike(venues.city, `%${query}%`),
      venues.address ? ilike(venues.address, `%${query}%`) : undefined
    )
  ];

  if (city) {
    conditions.push(ilike(venues.city, `%${city}%`));
  }

  if (state && venues.state) {
    conditions.push(ilike(venues.state, `%${state}%`));
  }

  searchQuery = searchQuery.where(and(...conditions.filter(Boolean)));

  const results = await searchQuery
    .orderBy(desc(sql`(
      SELECT COUNT(*)
      FROM shows s
      WHERE s.venue_id = ${venues.id}
    )`))
    .limit(limit);

  return results;
}

export async function getVenuesByCity(city: string, options?: {
  limit?: number;
  onlyWithUpcomingShows?: boolean;
}) {
  const { limit = 50, onlyWithUpcomingShows = false } = options || {};

  let query = db
    .select({
      venue: venues,
      showCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
      )`,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
        AND s.date >= CURRENT_DATE
      )`
    })
    .from(venues)
    .where(ilike(venues.city, city));

  if (onlyWithUpcomingShows) {
    query = query.where(
      and(
        ilike(venues.city, city),
        sql`EXISTS (
          SELECT 1 FROM shows s 
          WHERE s.venue_id = ${venues.id} 
          AND s.date >= CURRENT_DATE
        )`
      )
    );
  }

  const results = await query
    .orderBy(asc(venues.name))
    .limit(limit);

  return results;
}

export async function getNearbyVenues(latitude: number, longitude: number, radiusMiles = 25) {
  // Using PostgreSQL's earth_distance extension for geo queries
  // Assuming the extension is installed, otherwise use a simpler calculation
  const results = await db
    .select({
      venue: venues,
      distance: sql<number>`(
        CASE 
          WHEN ${venues.latitude} IS NOT NULL AND ${venues.longitude} IS NOT NULL 
          THEN (
            3959 * acos(
              cos(radians(${latitude})) *
              cos(radians(${venues.latitude})) *
              cos(radians(${venues.longitude}) - radians(${longitude})) +
              sin(radians(${latitude})) *
              sin(radians(${venues.latitude}))
            )
          )
          ELSE NULL
        END
      )`,
      showCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
      )`,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
        AND s.date >= CURRENT_DATE
      )`
    })
    .from(venues)
    .where(
      and(
        sql`${venues.latitude} IS NOT NULL`,
        sql`${venues.longitude} IS NOT NULL`,
        sql`(
          3959 * acos(
            cos(radians(${latitude})) *
            cos(radians(${venues.latitude})) *
            cos(radians(${venues.longitude}) - radians(${longitude})) +
            sin(radians(${latitude})) *
            sin(radians(${venues.latitude}))
          )
        ) <= ${radiusMiles}`
      )
    )
    .orderBy(sql`distance`)
    .limit(20);

  return results;
}

export async function getVenueReviews(venueId: string, options?: {
  limit?: number;
  offset?: number;
}) {
  const { limit = 20, offset = 0 } = options || {};

  const reviews = await db
    .select({
      review: venueReviews,
      user: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      }
    })
    .from(venueReviews)
    .innerJoin(users, eq(venueReviews.userId, users.id))
    .where(eq(venueReviews.venueId, venueId))
    .orderBy(desc(venueReviews.createdAt))
    .limit(limit)
    .offset(offset);

  return reviews;
}

export async function getTopRatedVenues(options?: {
  limit?: number;
  minReviews?: number;
}) {
  const { limit = 20, minReviews = 5 } = options || {};

  const results = await db
    .select({
      venue: venues,
      averageRating: sql<number>`AVG(vr.rating)::numeric(3,2)`,
      reviewCount: sql<number>`COUNT(vr.id)`,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(*)
        FROM shows s
        WHERE s.venue_id = ${venues.id}
        AND s.date >= CURRENT_DATE
      )`
    })
    .from(venues)
    .innerJoin(venueReviews, eq(venues.id, venueReviews.venueId))
    .groupBy(venues.id)
    .having(sql`COUNT(vr.id) >= ${minReviews}`)
    .orderBy(desc(sql`AVG(vr.rating)`))
    .limit(limit);

  return results;
}