import { db, venues } from "@repo/database";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const offset = Number.parseInt(searchParams.get("offset") || "0");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const country = searchParams.get("country") || "US";
    const venueType = searchParams.get("venueType");
    const search = searchParams.get("search");
    const orderBy = searchParams.get("orderBy") || "name";

    // Build dynamic filter conditions
    const conditions: SQL[] = [];

    if (city) {
      conditions.push(ilike(venues.city, `%${city}%`));
    }
    if (state) {
      conditions.push(eq(venues.state, state));
    }
    if (country) {
      conditions.push(eq(venues.country, country));
    }
    if (venueType) {
      conditions.push(eq(venues.venueType, venueType));
    }
    if (search) {
      conditions.push(ilike(venues.name, `%${search}%`));
    }

    const whereClause = conditions.length ? and(...conditions) : sql`TRUE`;

    // Decide ordering expression
    const orderExpr =
      orderBy === "totalShows"
        ? desc(venues.totalShows)
        : orderBy === "upcomingShows"
          ? desc(venues.upcomingShows)
          : orderBy === "capacity"
            ? desc(venues.capacity)
            : asc(venues.name);

    // Execute query - simplified for debugging
    const venuesData = await db
      .select()
      .from(venues)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(venues)
      .where(whereClause);

    const countResult = await countQuery;
    const totalCount = countResult[0]?.count || 0;

    return NextResponse.json({
      venues: venuesData,
      totalCount,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return NextResponse.json(
      { error: "Failed to fetch venues" },
      { status: 500 },
    );
  }
}
