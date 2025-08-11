import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

const ticketmaster = new TicketmasterClient({
  apiKey: process.env["TICKETMASTER_API_KEY"]!,
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
    source: "database" | "ticketmaster";
    externalId: string;
  };
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
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

    console.log(`Main search request: query="${query}", limit=${limit}`);

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        query,
        results: [],
        totalCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    // HYBRID SEARCH: Search local database first for better relevance
    const { createServiceClient } = await import("~/lib/supabase/server");
    const supabase = createServiceClient();
    
    // Search local database artists first (prioritized results)
    const { data: dbArtists, error: dbError } = await supabase
      .from("artists")
      .select("id, name, slug, image_url, genres, popularity")
      .ilike("name", `%${query}%`)
      .order("popularity", { ascending: false })
      .order("name")
      .limit(limit);

    let results: SearchResult[] = [];

    // Add database results first (highest priority)
    if (dbArtists && !dbError) {
      const dbResults: SearchResult[] = dbArtists.map((artist) => {
        let genres: string[] = [];
        if (artist.genres) {
          try {
            genres = JSON.parse(artist.genres);
          } catch (e) {
            console.warn(`Invalid JSON in genres for artist ${artist.name}:`, artist.genres);
            genres = [];
          }
        }
        
        return {
          id: artist.id,
          type: "artist" as const,
          name: artist.name,
          imageUrl: artist.image_url || undefined,
          description: genres.length > 0 ? `Genres: ${genres.join(", ")}` : undefined,
          metadata: {
            slug: artist.slug,
            popularity: artist.popularity || 0,
            genres,
            source: "database" as const,
            externalId: artist.id,
          }
        };
      });
      results = dbResults;
      console.log(`Found ${dbResults.length} local database artists`);
    }

    // If we haven't reached the limit, supplement with Ticketmaster results
    const remainingLimit = limit - results.length;
    if (remainingLimit > 0) {
      const apiKey = process.env["TICKETMASTER_API_KEY"];
      if (apiKey) {
        try {
          console.log("Supplementing with Ticketmaster API, remaining slots:", remainingLimit);

          const ticketmasterResponse = await ticketmaster.searchAttractions({
            keyword: query,
            size: remainingLimit,
            classificationName: "music",
            sort: "relevance,desc",
          });

          const ticketmasterArtists = ticketmasterResponse._embedded?.attractions || [];
          
          // Filter out artists that are already in database results
          const existingNames = results.map(a => a.name.toLowerCase());
          const newTicketmasterResults: SearchResult[] = ticketmasterArtists
            .filter((attraction: any) => 
              !existingNames.includes(attraction.name.toLowerCase())
            )
            .map((attraction: any) => ({
              id: `tm_${attraction.id}`,
              type: "artist" as const,
              name: attraction.name,
              imageUrl: attraction.images?.[0]?.url || undefined,
              description: attraction.classifications?.length > 0 
                ? `Genres: ${attraction.classifications.map((c: any) => c.genre?.name).filter(Boolean).join(", ")}`
                : undefined,
              metadata: {
                popularity: 0,
                genres: attraction.classifications
                  ?.map((c: any) => c.genre?.name)
                  .filter(Boolean) || [],
                source: "ticketmaster" as const,
                externalId: attraction.id,
              }
            }));

          results = [...results, ...newTicketmasterResults];
          console.log(`Added ${newTicketmasterResults.length} Ticketmaster results`);
        } catch (error) {
          console.error("Ticketmaster search failed, using database results only:", error);
        }
      } else {
        console.log("Ticketmaster API not configured, using database results only");
      }
    }

    // Sort final results: database results first (by popularity), then external results
    results.sort((a, b) => {
      // Database results first
      if (a.metadata?.source === "database" && b.metadata?.source !== "database") return -1;
      if (b.metadata?.source === "database" && a.metadata?.source !== "database") return 1;
      
      // Within database results, sort by popularity then name relevance
      if (a.metadata?.source === "database" && b.metadata?.source === "database") {
        const popularityDiff = (b.metadata.popularity || 0) - (a.metadata.popularity || 0);
        if (popularityDiff !== 0) return popularityDiff;
      }
      
      // For name relevance, exact matches first, then starts-with, then contains
      const queryLower = query.toLowerCase();
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      
      const aExact = aNameLower === queryLower ? 1 : 0;
      const bExact = bNameLower === queryLower ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      const aStartsWith = aNameLower.startsWith(queryLower) ? 1 : 0;
      const bStartsWith = bNameLower.startsWith(queryLower) ? 1 : 0;
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
      
      return a.name.localeCompare(b.name);
    });

    console.log(`Returning ${results.length} total artists, search relevance optimized`);
    
    const response = NextResponse.json({
      query,
      results: results.slice(0, limit),
      totalCount: results.slice(0, limit).length,
      timestamp: new Date().toISOString()
    });

    // Add cache headers for search results
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120"
    );

    return response;

  } catch (error) {
    console.error("Artist search error:", error);
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