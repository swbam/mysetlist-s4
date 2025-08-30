"use server";

import { unstable_cache } from "next/cache";
import { createConvexClient } from "~/lib/database";
import { api } from "../../../../convex/_generated/api";

export const getVenueBySlug = unstable_cache(
  async (slug: string) => {
    const [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.slug, slug))
      .limit(1);

    return venue || null;
  },
  ["venue-by-slug"],
  { revalidate: 3600 }, // Cache for 1 hour
);

export const getVenueShows = unstable_cache(
  async (
    venueId: string,
    type: "upcoming" | "past" = "upcoming",
    limit = 20,
  ) => {
    const now = new Date().toISOString().split("T")[0]!; // Format as YYYY-MM-DD
    const condition =
      type === "upcoming" ? gte(shows.date, now) : lte(shows.date, now);

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
      .orderBy(type === "upcoming" ? shows.date : desc(shows.date))
      .limit(limit);

    return venueShows;
  },
  ["venue-shows"],
  { revalidate: 300 }, // Cache for 5 minutes
);

export const getNearbyVenues = unstable_cache(
  async (
    currentVenueId: string,
    latitude: number | null,
    longitude: number | null,
    radiusKm = 10,
    limit = 6,
  ) => {
    if (!latitude || !longitude) {
      return [];
    }

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
        `.as("distance"),
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
          `,
        ),
      )
      .orderBy(sql`distance`)
      .limit(limit);

    return nearbyVenues;
  },
  ["nearby-venues"],
  { revalidate: 3600 },
);
