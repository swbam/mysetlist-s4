import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

const ticketmaster = new TicketmasterClient({
  apiKey: process.env["TICKETMASTER_API_KEY"]!,
});

interface ArtistResult {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  source: "ticketmaster" | "database";
  externalId: string;
  popularity?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Number.parseInt(searchParams.get("limit") || "8", 10);

    console.log(`Artist search request: query="${query}", limit=${limit}`);

    if (!query || query.length < 2) {
      return NextResponse.json({ artists: [] });
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

    let artists: ArtistResult[] = [];

    // Add database results first (highest priority)
    if (dbArtists && !dbError) {
      const dbResults: ArtistResult[] = dbArtists.map((artist) => {
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
          name: artist.name,
          imageUrl: artist.image_url || undefined,
          genres,
          source: "database" as const,
          externalId: artist.id,
          popularity: artist.popularity || 0,
        };
      });
      artists = dbResults;
      console.log(`Found ${dbResults.length} local database artists`);
    }

    // If we haven't reached the limit, supplement with Ticketmaster results
    const remainingLimit = limit - artists.length;
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
          const existingNames = artists.map(a => a.name.toLowerCase());
          const newTicketmasterResults: ArtistResult[] = ticketmasterArtists
            .filter((attraction: any) => 
              !existingNames.includes(attraction.name.toLowerCase())
            )
            .map((attraction: any) => ({
              id: `tm_${attraction.id}`,
              name: attraction.name,
              imageUrl: attraction.images?.[0]?.url || undefined,
              genres: attraction.classifications
                ?.map((c: any) => c.genre?.name)
                .filter(Boolean) || [],
              source: "ticketmaster" as const,
              externalId: attraction.id,
              popularity: 0,
            }));

          artists = [...artists, ...newTicketmasterResults];
          console.log(`Added ${newTicketmasterResults.length} Ticketmaster results`);
        } catch (error) {
          console.error("Ticketmaster search failed, using database results only:", error);
        }
      } else {
        console.log("Ticketmaster API not configured, using database results only");
      }
    }

    // Sort final results: database results first (by popularity), then external results
    artists.sort((a, b) => {
      // Database results first
      if (a.source === "database" && b.source !== "database") return -1;
      if (b.source === "database" && a.source !== "database") return 1;
      
      // Within database results, sort by popularity then name relevance
      if (a.source === "database" && b.source === "database") {
        const popularityDiff = (b.popularity || 0) - (a.popularity || 0);
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

    console.log(`Returning ${artists.length} total artists, search relevance optimized`);
    return NextResponse.json({ artists: artists.slice(0, limit) });
    
  } catch (error) {
    console.error("Artist search error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 },
    );
  }
}
