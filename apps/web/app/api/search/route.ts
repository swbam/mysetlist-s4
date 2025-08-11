import { type NextRequest, NextResponse } from "next/server";
import { db, artists, venues, shows, songs } from "@repo/database";
import { rateLimitMiddleware } from "~/middleware/rate-limit";
import { z } from "zod";
import { ilike, or, desc, asc, eq } from "drizzle-orm";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// Schema for search validation
const searchSchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["all", "artists", "venues", "shows", "songs"]).optional(),
  limit: z.number().min(1).max(50).optional(),
});

interface SearchResult {
  id: string;
  name: string;
  type: "artist" | "venue" | "show" | "song";
  imageUrl?: string;
  description?: string;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all";
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

    // Validate input
    const validation = searchSchema.safeParse({ q: query, type, limit });
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid search parameters", 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { q, type: searchType, limit: searchLimit } = validation.data;

    if (!q || q.length < 2) {
      return NextResponse.json({ 
        query: q,
        type: searchType,
        results: [],
        totalCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    const results: SearchResult[] = [];

    // Search artists
    if (searchType === "all" || searchType === "artists") {
      try {
        const artistsData = await db
          .select({
            id: artists.id,
            name: artists.name,
            slug: artists.slug,
            imageUrl: artists.imageUrl,
            genres: artists.genres,
            popularity: artists.popularity
          })
          .from(artists)
          .where(ilike(artists.name, `%${q}%`))
          .orderBy(desc(artists.popularity), asc(artists.name))
          .limit(searchType === "artists" ? searchLimit || 20 : 8);

        const artistResults: SearchResult[] = artistsData.map((artist) => ({
          id: artist.id,
          name: artist.name,
          type: "artist" as const,
          imageUrl: artist.imageUrl || undefined,
          description: artist.genres ? `Genres: ${JSON.parse(artist.genres).join(", ")}` : undefined,
          metadata: {
            slug: artist.slug,
            popularity: artist.popularity || 0,
            genres: artist.genres ? JSON.parse(artist.genres) : []
          }
        }));
        results.push(...artistResults);
      } catch (error) {
        console.error("Error searching artists:", error);
      }
    }

    // Search venues
    if (searchType === "all" || searchType === "venues") {
      try {
        const venuesData = await db
          .select({
            id: venues.id,
            name: venues.name,
            slug: venues.slug,
            city: venues.city,
            state: venues.state,
            country: venues.country,
            capacity: venues.capacity
          })
          .from(venues)
          .where(or(
            ilike(venues.name, `%${q}%`),
            ilike(venues.city, `%${q}%`)
          ))
          .orderBy(desc(venues.capacity), asc(venues.name))
          .limit(searchType === "venues" ? searchLimit || 20 : 8);

        const venueResults: SearchResult[] = venuesData.map((venue) => ({
          id: venue.id,
          name: venue.name,
          type: "venue" as const,
          description: [venue.city, venue.state, venue.country].filter(Boolean).join(", "),
          metadata: {
            slug: venue.slug,
            city: venue.city,
            state: venue.state,
            country: venue.country,
            capacity: venue.capacity
          }
        }));
        results.push(...venueResults);
      } catch (error) {
        console.error("Error searching venues:", error);
      }
    }

    // Search shows
    if (searchType === "all" || searchType === "shows") {
      try {
        const showsData = await db
          .select({
            id: shows.id,
            date: shows.date,
            tourName: shows.name,
            artistName: artists.name,
            artistSlug: artists.slug,
            artistImageUrl: artists.imageUrl,
            venueName: venues.name,
            venueCity: venues.city,
            venueState: venues.state
          })
          .from(shows)
          .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
          .innerJoin(venues, eq(shows.venueId, venues.id))
          .where(or(
            ilike(shows.name, `%${q}%`),
            ilike(artists.name, `%${q}%`),
            ilike(venues.name, `%${q}%`)
          ))
          .orderBy(desc(shows.date))
          .limit(searchType === "shows" ? searchLimit || 20 : 6);

        const showResults: SearchResult[] = showsData.map((show) => ({
          id: show.id,
          name: `${show.artistName} - ${show.venueName}`,
          type: "show" as const,
          imageUrl: show.artistImageUrl || undefined,
          description: `${new Date(show.date).toLocaleDateString()} • ${show.venueCity}, ${show.venueState}`,
          metadata: {
            date: show.date,
            artist: {
              name: show.artistName,
              slug: show.artistSlug
            },
            venue: {
              name: show.venueName,
              city: show.venueCity,
              state: show.venueState
            }
          }
        }));
        results.push(...showResults);
      } catch (error) {
        console.error("Error searching shows:", error);
      }
    }

    // Search songs (from setlists)
    if (searchType === "all" || searchType === "songs") {
      try {
        const songsData = await db
          .select({
            id: songs.id,
            songTitle: songs.title,
            artistName: songs.artist
          })
          .from(songs)
          .where(ilike(songs.title, `%${q}%`))
          .orderBy(asc(songs.title))
          .limit(searchType === "songs" ? searchLimit || 20 : 6);

        const songResults: SearchResult[] = songsData.map((song) => ({
          id: song.id,
          name: song.songTitle,
          type: "song" as const,
          description: `by ${song.artistName}`,
          metadata: {
            artist: {
              name: song.artistName
            }
          }
        }));
        results.push(...songResults);
      } catch (error) {
        console.error("Error searching songs:", error);
      }
    }

    // Sort results by relevance (exact matches first, then contains matches)
    const sortedResults = results.sort((a, b) => {
      const queryLower = q.toLowerCase();
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      
      // Exact matches first
      const aExact = aNameLower === queryLower ? 1 : 0;
      const bExact = bNameLower === queryLower ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      // Starts with matches
      const aStartsWith = aNameLower.startsWith(queryLower) ? 1 : 0;
      const bStartsWith = bNameLower.startsWith(queryLower) ? 1 : 0;
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
      
      // Then by type priority (artists > venues > shows > songs)
      const typeOrder = { artist: 0, venue: 1, show: 2, song: 3 };
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      if (typeDiff !== 0) return typeDiff;
      
      return a.name.localeCompare(b.name);
    });

    const finalResults = sortedResults.slice(0, searchLimit || 20);

    const response = NextResponse.json({
      query: q,
      type: searchType,
      results: finalResults,
      totalCount: finalResults.length,
      timestamp: new Date().toISOString()
    });

    // Add cache headers for search results
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120"
    );

    return response;

  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}