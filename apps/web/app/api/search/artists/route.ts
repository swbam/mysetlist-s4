import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

const ticketmaster = new TicketmasterClient({
  apiKey: process.env.TICKETMASTER_API_KEY!,
});

interface InlineSearchResult {
  tmAttractionId: string;
  name: string;
  image?: string;
  genreHints?: string[];
}

// In-memory cache for search results to reduce API calls
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes for inline search

export async function GET(request: NextRequest) {
  // Apply rate limiting
  if (process.env.NODE_ENV === "production") {
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "10", 10), 20); // Cap at 20

    console.log(`Inline artist search: query="${query}", limit=${limit}`);

    // Validate minimum query length
    if (!query || query.length < 2) {
      return NextResponse.json({
        query,
        results: [],
        totalCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Check cache first
    const cacheKey = `inline:${query}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached inline search results for: ${query}`);
      return NextResponse.json(cached.data);
    }

    // Validate Ticketmaster API key
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("Ticketmaster API not configured");
    }

    let results: InlineSearchResult[] = [];

    try {
      console.log(`Searching Ticketmaster attractions for inline search: ${query}`);

      const ticketmasterResponse = await ticketmaster.searchAttractions({
        keyword: query,
        size: limit,
        classificationName: "music",
        sort: "relevance,desc",
      });

      const attractions = ticketmasterResponse._embedded?.attractions || [];

      results = attractions.map((attraction: any) => ({
        tmAttractionId: attraction.id,
        name: attraction.name,
        image: attraction.images?.[0]?.url,
        genreHints: attraction.classifications
          ?.map((c: any) => c.genre?.name)
          .filter(Boolean) || [],
      }));

      console.log(`Found ${results.length} attractions for inline search`);
    } catch (error: any) {
      // Handle Ticketmaster API errors gracefully
      if (error?.response?.status === 429 || error?.message?.includes("429")) {
        console.error("Ticketmaster API rate limit reached");
        return NextResponse.json(
          {
            error: "Search temporarily unavailable. Please try again in a moment.",
            query,
            results: [],
            totalCount: 0,
            timestamp: new Date().toISOString(),
          },
          { status: 429 },
        );
      }
      
      console.error("Ticketmaster inline search failed:", error);
      return NextResponse.json(
        {
          error: "Search service unavailable. Please try again later.",
          query,
          results: [],
          totalCount: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    // Sort results by name relevance
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

    const responseData = {
      query,
      results: results.slice(0, limit),
      totalCount: results.length,
      timestamp: new Date().toISOString(),
    };

    // Cache the results
    searchCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    // Clean up old cache entries (keep cache size manageable)
    if (searchCache.size > 200) {
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
      "public, s-maxage=300, stale-while-revalidate=600", // 5 min cache, 10 min stale
    );

    return response;
  } catch (error) {
    console.error("Inline artist search error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        query: request.nextUrl.searchParams.get("q") || "",
        results: [],
        totalCount: 0,
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