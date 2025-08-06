"use server";

import { db } from "@repo/database";
import { shows, venueReviews, venues } from "@repo/database/src/schema";
import { and, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

interface GetVenuesParams {
  search?: string;
  types?: string[];
  capacity?: string;
  userLat?: number;
  userLng?: number;
  limit?: number;
}

export const getVenues = unstable_cache(
  async ({
    search,
    types,
    capacity,
    userLat,
    userLng,
    limit = 50,
  }: GetVenuesParams) => {
    const conditions: any[] = [];

    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(venues.name, `%${search}%`),
          ilike(venues.city, `%${search}%`),
          ilike(venues.state, `%${search}%`),
          ilike(venues.country, `%${search}%`),
        ),
      );
    }

    // Type filter
    if (types && types.length > 0) {
      conditions.push(inArray(venues.venueType, types));
    }

    // Capacity filter
    if (capacity && capacity !== "all") {
      switch (capacity) {
        case "small":
          conditions.push(lte(venues.capacity, 1000));
          break;
        case "medium":
          conditions.push(
            and(gte(venues.capacity, 1000), lte(venues.capacity, 5000)),
          );
          break;
        case "large":
          conditions.push(
            and(gte(venues.capacity, 5000), lte(venues.capacity, 20000)),
          );
          break;
        case "xlarge":
          conditions.push(gte(venues.capacity, 20000));
          break;
      }
    }

    // Build query with conditions
    const baseQuery = db
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        address: venues.address,
        city: venues.city,
        state: venues.state,
        country: venues.country,
        capacity: venues.capacity,
        venueType: venues.venueType,
        imageUrl: venues.imageUrl,
        amenities: venues.amenities,
        latitude: venues.latitude,
        longitude: venues.longitude,
        // Add distance calculation if user location is provided
        ...(userLat && userLng
          ? {
              distance: sql<number>`
                6371 * acos(
                  cos(radians(${userLat})) * cos(radians(${venues.latitude})) *
                  cos(radians(${venues.longitude}) - radians(${userLng})) +
                  sin(radians(${userLat})) * sin(radians(${venues.latitude}))
                )
              `.as("distance"),
            }
          : {}),
      })
      .from(venues);

    // Apply conditions if any
    const queryWithConditions =
      conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    // Apply sorting
    const queryWithSort =
      userLat && userLng
        ? queryWithConditions.orderBy(sql`distance`)
        : queryWithConditions.orderBy(venues.name);

    const results = await queryWithSort.limit(limit);

    // Get additional data for each venue
    const venuesWithStats = await Promise.all(
      results.map(async (venue) => {
        // Get average rating and review count
        const reviewStats = await db
          .select({
            avgRating: sql<number>`AVG(${venueReviews.rating})`,
            reviewCount: sql<number>`COUNT(${venueReviews.id})`,
          })
          .from(venueReviews)
          .where(eq(venueReviews.venueId, venue.id));

        // Get upcoming show count
        const now = new Date().toISOString().split("T")[0]!; // Format as YYYY-MM-DD
        const [showCount] = await db
          .select({
            count: sql<number>`COUNT(${shows.id})`,
          })
          .from(shows)
          .where(and(eq(shows.venueId, venue.id), gte(shows.date, now)));

        return {
          ...venue,
          avgRating: reviewStats[0]?.avgRating || null,
          reviewCount: reviewStats[0]?.reviewCount || 0,
          upcomingShowCount: showCount?.count || 0,
        };
      }),
    );

    return venuesWithStats;
  },
  ["venues-list"],
  { revalidate: 300 }, // Cache for 5 minutes
);
