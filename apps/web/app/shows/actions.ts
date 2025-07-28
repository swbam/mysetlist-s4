"use server"

import { artists, db, showArtists, shows, venues } from "@repo/database"
import {
  type SQL,
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  sql,
} from "drizzle-orm"
import { cache } from "react"

export type ShowWithDetails = {
  id: string
  name: string
  slug: string
  date: string
  startTime: string | null
  doorsTime: string | null
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  description: string | null
  ticketUrl: string | null
  minPrice: number | null
  maxPrice: number | null
  currency: string
  viewCount: number
  attendeeCount: number
  setlistCount: number
  voteCount: number
  trendingScore: number
  isFeatured: boolean
  isVerified: boolean
  headlinerArtist: {
    id: string
    name: string
    slug: string
    imageUrl: string | null
    genres: string[] | null
    verified: boolean
  }
  venue: {
    id: string
    name: string
    slug: string
    city: string
    state: string | null
    country: string
    capacity: number | null
  } | null
  supportingArtists: Array<{
    id: string
    artistId: string
    orderIndex: number
    setLength: number | null
    artist: {
      id: string
      name: string
      slug: string
    }
  }>
}

type FetchShowsParams = {
  status?: "upcoming" | "ongoing" | "completed" | "cancelled"
  city?: string
  artistId?: string
  venueId?: string
  dateFrom?: string
  dateTo?: string
  featured?: boolean
  orderBy?: "date" | "trending" | "popularity"
  limit?: number
  offset?: number
}

export const fetchShows = cache(
  async (
    params: FetchShowsParams = {}
  ): Promise<{
    shows: ShowWithDetails[]
    totalCount: number
  }> => {
    const {
      status: statusParam = "upcoming",
      city,
      artistId,
      venueId,
      dateFrom,
      dateTo,
      featured,
      orderBy = "date",
      limit = 20,
      offset = 0,
    } = params

    const status =
      (statusParam as "upcoming" | "ongoing" | "completed" | "cancelled") ||
      "upcoming"

    try {
      // Build conditions for filtering
      const conditions: SQL[] = []

      if (status) {
        conditions.push(eq(shows.status, status))
      }

      if (artistId) {
        conditions.push(eq(shows.headlinerArtistId, artistId))
      }

      if (venueId) {
        conditions.push(eq(shows.venueId, venueId))
      }

      if (dateFrom) {
        conditions.push(gte(shows.date, dateFrom))
      }

      if (dateTo) {
        conditions.push(lte(shows.date, dateTo))
      }

      if (featured) {
        conditions.push(eq(shows.isFeatured, true))
      }

      if (city) {
        conditions.push(ilike(venues.city, `%${city}%`))
      }

      // Default to upcoming shows if no specific status filter
      if (!dateFrom && status === "upcoming") {
        conditions.push(
          gte(shows.date, new Date().toISOString().substring(0, 10))
        )
      }

      // Determine ordering
      let orderByClause
      switch (orderBy) {
        case "trending":
          orderByClause = desc(shows.trendingScore)
          break
        case "popularity":
          orderByClause = desc(shows.viewCount)
          break
        default:
          orderByClause = asc(shows.date)
          break
      }

      // Build and execute query in one go to maintain type safety
      const showsData = await db
        .select({
          id: shows.id,
          name: shows.name,
          slug: shows.slug,
          date: shows.date,
          startTime: shows.startTime,
          doorsTime: shows.doorsTime,
          status: shows.status,
          description: shows.description,
          ticketUrl: shows.ticketUrl,
          minPrice: shows.minPrice,
          maxPrice: shows.maxPrice,
          currency: shows.currency,
          viewCount: shows.viewCount,
          attendeeCount: shows.attendeeCount,
          setlistCount: shows.setlistCount,
          voteCount: shows.voteCount,
          trendingScore: shows.trendingScore,
          isFeatured: shows.isFeatured,
          isVerified: shows.isVerified,
          headlinerArtist: {
            id: artists.id,
            name: artists.name,
            slug: artists.slug,
            imageUrl: artists.imageUrl,
            genres: artists.genres,
            verified: artists.verified,
          },
          venue: {
            id: venues.id,
            name: venues.name,
            slug: venues.slug,
            city: venues.city,
            state: venues.state,
            country: venues.country,
            capacity: venues.capacity,
          },
        })
        .from(shows)
        .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
        .leftJoin(venues, eq(shows.venueId, venues.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset)

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(shows)
        .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
        .leftJoin(venues, eq(shows.venueId, venues.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
      const totalCount = countResult[0]?.count || 0

      // Get supporting artists for each show (separate query for performance)
      const showIds = showsData.map((show) => show.id)
      const supportingArtistsData =
        showIds.length > 0
          ? await db
              .select({
                showId: showArtists.showId,
                id: showArtists.id,
                artistId: showArtists.artistId,
                orderIndex: showArtists.orderIndex,
                setLength: showArtists.setLength,
                artist: {
                  id: artists.id,
                  name: artists.name,
                  slug: artists.slug,
                },
              })
              .from(showArtists)
              .innerJoin(artists, eq(showArtists.artistId, artists.id))
              .where(inArray(showArtists.showId, showIds))
              .orderBy(showArtists.orderIndex)
          : []

      // Group supporting artists by show
      const supportingArtistsByShow = supportingArtistsData.reduce(
        (acc, sa) => {
          if (!acc[sa.showId]) {
            acc[sa.showId] = []
          }
          acc[sa.showId]!.push({
            id: sa.id,
            artistId: sa.artistId,
            orderIndex: sa.orderIndex,
            setLength: sa.setLength,
            artist: sa.artist,
          })
          return acc
        },
        {} as Record<
          string,
          Array<{
            id: string
            artistId: string
            orderIndex: number
            setLength: number | null
            artist: {
              id: string
              name: string
              slug: string
            }
          }>
        >
      )

      // Safe JSON parse function
      const safeJsonParse = (jsonString: string | null) => {
        if (!jsonString) return null
        try {
          return JSON.parse(jsonString)
        } catch {
          return null
        }
      }

      // Format response data
      const formattedShows: ShowWithDetails[] = showsData.map((show) => ({
        id: show.id,
        name: show.name,
        slug: show.slug,
        date: show.date,
        startTime: show.startTime,
        doorsTime: show.doorsTime,
        status: show.status,
        description: show.description,
        ticketUrl: show.ticketUrl,
        minPrice: show.minPrice,
        maxPrice: show.maxPrice,
        currency: show.currency || "USD",
        viewCount: show.viewCount || 0,
        attendeeCount: show.attendeeCount || 0,
        setlistCount: show.setlistCount || 0,
        voteCount: show.voteCount || 0,
        trendingScore: show.trendingScore || 0,
        isFeatured: show.isFeatured || false,
        isVerified: show.isVerified || false,
        headlinerArtist: {
          ...show.headlinerArtist,
          genres: safeJsonParse(show.headlinerArtist.genres),
          verified: show.headlinerArtist.verified || false,
        },
        venue: show.venue,
        supportingArtists: supportingArtistsByShow[show.id] || [],
      }))

      return {
        shows: formattedShows,
        totalCount,
      }
    } catch (error) {
      console.error("Error fetching shows:", error)
      return {
        shows: [],
        totalCount: 0,
      }
    }
  }
)

export const fetchCities = cache(async (): Promise<string[]> => {
  try {
    const data = await db
      .select({ city: venues.city })
      .from(venues)
      .where(sql`${venues.city} IS NOT NULL`)
      .orderBy(venues.city)

    // Get unique cities
    const uniqueCities = [...new Set(data.map((v) => v.city).filter(Boolean))]
    return uniqueCities
  } catch (error) {
    console.error("Error fetching cities:", error)
    return []
  }
})
