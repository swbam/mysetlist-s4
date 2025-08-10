import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";

const ticketmaster = new TicketmasterClient({
  apiKey: process.env.TICKETMASTER_API_KEY!,
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

    if (!query || query.length < 2) {
      return NextResponse.json({ artists: [] });
    }

    if (!process.env.TICKETMASTER_API_KEY) {
      return NextResponse.json(
        {
          error: "Ticketmaster API key not configured",
          message: "Unable to search artists",
        },
        { status: 500 },
      );
    }

    try {
      const ticketmasterResponse = await ticketmaster.searchAttractions({
        keyword: query,
        size: limit,
        classificationName: "music",
        sort: "relevance,desc",
      });
      
      const ticketmasterArtists = ticketmasterResponse._embedded?.attractions || [];
      
      const artists: ArtistResult[] = ticketmasterArtists.map((attraction) => ({
        id: attraction.id,
        name: attraction.name,
        imageUrl: attraction.images?.[0]?.url || undefined,
        genres: attraction.classifications?.map((c: any) => c.genre?.name).filter(Boolean) || [],
        source: "ticketmaster" as const,
        externalId: attraction.id,
      }));

      return NextResponse.json({ artists });
    } catch (error) {
      console.error("Ticketmaster search failed:", error);
      return NextResponse.json(
        {
          error: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Artist search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}