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
  source: "ticketmaster";
  externalId: string;
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

    // Check if Ticketmaster API key is configured
    const apiKey = process.env["TICKETMASTER_API_KEY"];
    if (!apiKey) {
      console.error("TICKETMASTER_API_KEY not configured");
      return NextResponse.json(
        {
          error: "Search service not configured",
          message: "Artist search is temporarily unavailable",
        },
        { status: 503 }, // Service Unavailable instead of 500
      );
    }

    try {
      console.log("Calling Ticketmaster API with params:", {
        keyword: query,
        size: limit,
        classificationName: "music",
        sort: "relevance,desc"
      });

      const ticketmasterResponse = await ticketmaster.searchAttractions({
        keyword: query,
        size: limit,
        classificationName: "music",
        sort: "relevance,desc",
      });

      console.log("Ticketmaster response received:", {
        hasEmbedded: !!ticketmasterResponse._embedded,
        attractionCount: ticketmasterResponse._embedded?.attractions?.length || 0
      });

      const ticketmasterArtists =
        ticketmasterResponse._embedded?.attractions || [];

      const artists: ArtistResult[] = ticketmasterArtists.map((attraction) => ({
        id: attraction.id,
        name: attraction.name,
        imageUrl: attraction.images?.[0]?.url || undefined,
        genres:
          attraction.classifications
            ?.map((c: any) => c.genre?.name)
            .filter(Boolean) || [],
        source: "ticketmaster" as const,
        externalId: attraction.id,
      }));

      console.log(`Successfully processed ${artists.length} artists`);
      return NextResponse.json({ artists });
    } catch (error) {
      console.error("Ticketmaster search failed:", error);
      
      // Differentiate between different types of API errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          return NextResponse.json(
            {
              error: "Search service authentication failed",
              message: "Invalid API credentials",
            },
            { status: 503 },
          );
        } else if (error.message.includes('429')) {
          return NextResponse.json(
            {
              error: "Search service rate limited",
              message: "Please try again later",
            },
            { status: 429 },
          );
        } else if (error.message.includes('timeout')) {
          return NextResponse.json(
            {
              error: "Search service timeout",
              message: "Request timed out, please try again",
            },
            { status: 408 },
          );
        }
      }
      
      return NextResponse.json(
        {
          error: "Search service error",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString()
        },
        { status: 503 },
      );
    }
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
