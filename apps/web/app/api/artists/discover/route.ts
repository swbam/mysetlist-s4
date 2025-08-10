import { artists, db } from "@repo/database";
import { type SQLWrapper, and, ilike, or, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

/**
 * POST /api/artists/discover
 *
 * Body:
 * {
 *   genres?: string[]
 *   popularity?: "high" | "medium" | "low"
 *   location?: { lat: number; lng: number; radius: number }
 * }
 *
 * Returns: { artists: [...] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const {
    genres = [],
    popularity,
    location,
  } = body as {
    genres?: string[];
    popularity?: "high" | "medium" | "low";
    location?: { lat: number; lng: number; radius: number };
  };

  try {
    const conditions: SQLWrapper[] = [];

    // Filter by genres
    if (genres.length) {
      const genreConds = genres.map((g) => ilike(artists.genres, `%${g}%`));
      conditions.push(or(...genreConds) as SQLWrapper);
    }

    // Popularity bucketing (example based on followers field)
    if (popularity) {
      const buckets = {
        high: sql`${artists.followers} > 1000000`,
        medium: sql`${artists.followers} BETWEEN 100000 AND 1000000`,
        low: sql`${artists.followers} < 100000`,
      } as const;
      conditions.push(buckets[popularity]!);
    }

    // TODO: Location based filtering can be implemented once we store geo coords
    if (location) {
      console.info(
        "Location based discovery requested but not yet implemented",
        location,
      );
    }

    const rows = await db
      .select()
      .from(artists)
      .where(conditions.length ? and(...conditions) : sql`TRUE`)
      .limit(40);

    return Response.json({ artists: rows });
  } catch (error) {
    console.error("Artist discovery failed:", error);
    return Response.json({ error: "Artist discovery failed" }, { status: 500 });
  }
}
