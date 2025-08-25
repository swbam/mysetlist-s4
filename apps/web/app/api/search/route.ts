import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";
import { db, artists } from "@repo/database";
import { inArray } from "drizzle-orm";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface SearchResult {
  id: string;
  type: "artist"; // Only artists are searchable per PRD requirements
  name: string;
  imageUrl?: string;
  description?: string;
  metadata?: {
    slug?: string;
    popularity?: number;
    genres?: string[];
    source: "ticketmaster";
    externalId: string;
  };
}

// In-memory cache for search results to reduce API calls
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

export async function GET(request: NextRequest) {
  // Apply rate limiting only in production
  if (process.env['NODE_ENV'] === "production") {
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

    console.log(`Main search request: query="${query}", limit=${limit}`);

    if (!query || query.length < 2) {
      return NextResponse.json({
        query,
        results: [],
        totalCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Check cache first
    const cacheKey = `${query}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached results for: ${query}`);
      return NextResponse.json(cached.data);
    }

    // TICKETMASTER-ONLY SEARCH: Always query Ticketmaster API directly
    const apiKey = process.env['TICKETMASTER_API_KEY'];
    if (!apiKey) {
      throw new Error("Ticketmaster API not configured");
    }

    let results: SearchResult[] = [];

    try {
      console.log(`Searching Ticketmaster for: ${query}, limit: ${limit}`);

      // Direct API call to bypass client issues
      const apiKey = process.env['TICKETMASTER_API_KEY'];
      if (!apiKey) {
        throw new Error("Ticketmaster API key not configured");
      }

      const tmUrl = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(query)}&size=${limit}&apikey=${apiKey}`;
      
      const ticketmasterResponse = await fetch(tmUrl);
      if (!ticketmasterResponse.ok) {
        throw new Error(`Ticketmaster API error: ${ticketmasterResponse.status}`);
      }

      const tmData = await ticketmasterResponse.json();
      const ticketmasterArtists = tmData._embedded?.attractions || [];

      results = ticketmasterArtists.map((attraction: any) => ({
        id: `tm_${attraction.id}`,
        type: "artist" as const,
        name: attraction.name,
        ...(attraction.images?.[0]?.url && { imageUrl: attraction.images[0].url }),
        description:
          attraction.classifications?.length > 0
            ? `Genres: ${attraction.classifications
                .map((c: any) => c.genre?.name)
                .filter(Boolean)
                .join(", ")}`
            : undefined,
        metadata: {
          popularity: 0,
          genres:
            attraction.classifications
              ?.map((c: any) => c.genre?.name)
              .filter(Boolean) || [],
          source: "ticketmaster" as const,
          externalId: attraction.id,
        },
      }));

      console.log(`Found ${results.length} Ticketmaster artists`);
    } catch (error: any) {
      // Handle Ticketmaster API errors
      if (error?.response?.status === 429 || error?.message?.includes("429")) {
        console.error("Ticketmaster API rate limit reached");
        throw new Error(
          "Search temporarily unavailable. Please try again in a moment.",
        );
      }
      console.error("Ticketmaster search failed:", error);
      throw new Error("Search service unavailable. Please try again later.");
    }

    // Sort results by name relevance for better user experience
    results.sort((a, b) => {
      const queryLower = query.toLowerCase();
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();

      // Exact matches first
      const aExact = aNameLower === queryLower ? 1 : 0;
      const bExact = bNameLower === queryLower ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // Then starts-with matches
      const aStartsWith = aNameLower.startsWith(queryLower) ? 1 : 0;
      const bStartsWith = bNameLower.startsWith(queryLower) ? 1 : 0;
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

      // Finally alphabetical order
      return a.name.localeCompare(b.name);
    });

    // Enrich results with existing artists in database to provide slug/popularity
    try {
      const tmIds = results.map(r => r.metadata?.externalId).filter(Boolean);
      if (tmIds.length > 0) {
        const existing = await db
          .select({ tmAttractionId: artists.tmAttractionId, slug: artists.slug, popularity: artists.popularity })
          .from(artists)
          .where(inArray(artists.tmAttractionId, tmIds.filter((id): id is string => id !== undefined)));

        const slugMap = new Map(existing.map(e => [e.tmAttractionId, e]));
        results = results.map(r => {
          const info = slugMap.get(r.metadata?.externalId || "");
          if (info) {
            return {
              ...r,
              metadata: {
                ...r.metadata,
                slug: info.slug,
                popularity: info.popularity,
                source: "database" as const,
              },
            } as unknown as typeof r;
          }
          return r;
        });
      }
    } catch(dbErr) {
      console.error("Failed to enrich search results from DB", dbErr);
    }

    console.log(
      `Returning ${results.length} total artists, search relevance optimized`,
    );

    const responseData = {
      query,
      results: results.slice(0, limit),
      totalCount: results.slice(0, limit).length,
      timestamp: new Date().toISOString(),
    };

    // Cache the results
    searchCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    // Clean up old cache entries
    if (searchCache.size > 100) {
      const entries = Array.from(searchCache.entries());
      const now = Date.now();
      entries.forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_TTL * 2) {
          searchCache.delete(key);
        }
      });
    }

    const response = NextResponse.json(responseData);

    // Add cache headers for search results
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120",
    );

    return response;
  } catch (error) {
    console.error("Artist search error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
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
    },
  );
}
