import { calculateVenueGrowth } from "@repo/database"
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "~/lib/supabase/server"
import type { TrendingVenue, TrendingVenuesResponse } from "~/types/api"

// Force dynamic rendering for API route
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const timeframe = searchParams.get("timeframe") || "week"

    const supabase = await createServiceClient()

    // Get venues with real analytics and historical data
    const { data: raw, error } = await supabase
      .from("venues")
      .select(`
        id,
        name,
        slug,
        city,
        state,
        country,
        capacity,
        total_shows,
        upcoming_shows,
        total_attendance,
        average_rating,
        previous_total_shows,
        previous_upcoming_shows,
        previous_total_attendance
      `)
      .not("capacity", "is", null)
      .order("total_shows", { ascending: false, nullsFirst: false })
      .order("capacity", { ascending: false })
      .limit(limit)

    if (error) throw error

    const formatted: TrendingVenue[] = ((raw || []) as any[]).map((v, idx) => {
      // Calculate real growth using historical data (no fake calculations)
      const realGrowth = calculateVenueGrowth({
        totalShows: v.total_shows ?? 0,
        previousTotalShows: v.previous_total_shows,
        upcomingShows: v.upcoming_shows ?? 0,
        previousUpcomingShows: v.previous_upcoming_shows,
        totalAttendance: v.total_attendance ?? 0,
        previousTotalAttendance: v.previous_total_attendance,
      })

      // Use real growth data only (0 if no historical data available)
      const weeklyGrowth = realGrowth.overallGrowth

      // Calculate trending score based on real metrics
      const score =
        (v.total_shows ?? 0) * 10 +
        (v.upcoming_shows ?? 0) * 15 +
        (v.total_attendance ?? 0) / 100 +
        (v.capacity ?? 1000) / 100

      return {
        id: v.id,
        name: v.name,
        slug: v.slug,
        city: v.city,
        state: v.state,
        country: v.country,
        capacity: v.capacity ?? null,
        upcomingShows: v.upcoming_shows ?? 0, // Real data from database
        totalShows: v.total_shows ?? 0, // Real data from database
        trendingScore: score,
        weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
        rank: idx + 1,
      }
    })

    const payload: TrendingVenuesResponse = {
      venues: formatted,
      timeframe,
      total: formatted.length,
      generatedAt: new Date().toISOString(),
    }

    const response = NextResponse.json(payload)

    // Add cache headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    )

    return response
  } catch (_error) {
    // Return empty array with fallback data instead of error
    const fallbackPayload: TrendingVenuesResponse = {
      venues: [],
      timeframe: request.nextUrl.searchParams.get("timeframe") || "week",
      total: 0,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: "Unable to load trending venues at this time",
    }

    return NextResponse.json(fallbackPayload, {
      status: 200, // Return 200 to prevent UI crashes
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    })
  }
}
