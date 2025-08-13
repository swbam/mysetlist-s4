import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

const ticketmaster = new TicketmasterClient({
  apiKey:
    process.env.TICKETMASTER_API_KEY || "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b",
});

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
  if (process.env.NODE_ENV === "production") {
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
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("Ticketmaster API not configured");
    }

    let results: SearchResult[] = [];

    try {
      console.log(`Searching Ticketmaster for: ${query}, limit: ${limit}`);

      // Delegate to artists-specific search endpoint for minimal payload
      const ticketmasterResponse = await ticketmaster.searchAttractions({
        keyword: query,
        size: limit,
        classificationName: "music",
        sort: "relevance,desc",
      });

      const ticketmasterArtists =
        ticketmasterResponse._embedded?.attractions || [];

      results = ticketmasterArtists.map((attraction: any) => ({
        id: `tm_${attraction.id}`,
        type: "artist" as const,
        name: attraction.name,
        imageUrl: attraction.images?.[0]?.url || undefined,
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
