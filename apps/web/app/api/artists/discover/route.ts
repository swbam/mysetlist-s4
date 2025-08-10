import { NextRequest } from "next/server";
import { db } from "@repo/database";
import { artists } from "@repo/database";
import { ilike, or, sql } from "drizzle-orm";

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
  const { genres = [], popularity, location } = body as {
    genres?: string[];
    popularity?: "high" | "medium" | "low";
    location?: { lat: number; lng: number; radius: number };
  };

  try {
    let query = db
      .select()
      .from(artists)
      .limit(40);

    // Filter by genres
    if (genres.length) {
      genres.forEach((g, idx) => {
        const cond = ilike(artists.genres, `%${g}%`);
        query = idx === 0 ? query.where(cond) : query.or(cond);
      });
    }

    // Popularity bucketing (example based on followers field)
    if (popularity) {
      const buckets = {
        high: sql`${artists.followers} > 1000000`,
        medium: sql`${artists.followers} BETWEEN 100000 AND 1000000`,
        low: sql`${artists.followers} < 100000`,
      } as const;
      query = query.where(buckets[popularity]);
    }

    // TODO: Location based filtering can be implemented once we store geo coords
    if (location) {
      console.info("Location based discovery requested but not yet implemented", location);
    }

    const rows = await query;

    return Response.json({ artists: rows });
  } catch (error) {
    console.error("Artist discovery failed:", error);
    return Response.json({ error: "Artist discovery failed" }, { status: 500 });
  }
}
