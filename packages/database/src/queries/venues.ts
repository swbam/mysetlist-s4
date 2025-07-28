import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm"
import { db } from "../client"
import { venues } from "../schema"

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
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1)

  return result[0] || null
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
    })
    .from(venues)
    .where(eq(venues.slug, slug))
    .limit(1)

  return result[0] || null
}

export async function searchVenues(
  query: string,
  options?: {
    limit?: number
    city?: string
    state?: string
  }
) {
  const { limit = 20, city, state } = options || {}

  const conditions = [
    or(
      ilike(venues.name, `%${query}%`),
      ilike(venues.city, `%${query}%`),
      venues.address ? ilike(venues.address, `%${query}%`) : undefined
    ),
  ]

  if (city) {
    conditions.push(ilike(venues.city, `%${city}%`))
  }

  if (state && venues.state) {
    conditions.push(ilike(venues.state, `%${state}%`))
  }

  const results = await db
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
    })
    .from(venues)
    .where(and(...conditions.filter(Boolean)))
    .orderBy(
      desc(sql`(
      SELECT COUNT(*)
      FROM shows s
      WHERE s.venue_id = ${venues.id}
    )`)
    )
    .limit(limit)

  return results
}

export async function getVenuesByCity(
  city: string,
  options?: {
    limit?: number
    onlyWithUpcomingShows?: boolean
  }
) {
  const { limit = 50, onlyWithUpcomingShows = false } = options || {}

  const conditions = [ilike(venues.city, city)]

  if (onlyWithUpcomingShows) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM shows s 
        WHERE s.venue_id = ${venues.id} 
        AND s.date >= CURRENT_DATE
      )`
    )
  }

  const results = await db
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
    })
    .from(venues)
    .where(and(...conditions))
    .orderBy(asc(venues.name))
    .limit(limit)

  return results
}

export async function getNearbyVenues(
  latitude: number,
  longitude: number,
  radiusMiles = 25
) {
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
      )`,
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
    .limit(20)

  return results
}
