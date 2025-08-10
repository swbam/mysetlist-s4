import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";

const ticketmaster = new TicketmasterClient({
  apiKey: process.env.TICKETMASTER_API_KEY!,
});

export const dynamic = "force-dynamic";

interface SearchSuggestion {
  id: string;
  type: "artist";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  metadata?: {
    popularity?: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.toLowerCase().trim();
    const limit = Number.parseInt(searchParams.get("limit") || "8");

    if (!query || query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        count: 0,
      });
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
      // Use Ticketmaster API for consistent artist search experience
      const ticketmasterResponse = await ticketmaster.searchAttractions({
        keyword: query,
        size: limit,
        classificationName: "music",
        sort: "relevance,desc",
      });

      const ticketmasterArtists = ticketmasterResponse._embedded?.attractions || [];

      const suggestions: SearchSuggestion[] = ticketmasterArtists.map((attraction) => ({
        id: attraction.id,
        type: "artist" as const,
        title: attraction.name,
        subtitle: attraction.classifications?.map((c: any) => c.genre?.name).filter(Boolean).join(", ") || "",
        imageUrl: attraction.images?.[0]?.url || undefined,
        metadata: {
          popularity: 100, // Default popularity since Ticketmaster doesn't provide this metric
        },
      }));

      return NextResponse.json({
        suggestions,
        count: suggestions.length,
        searchType: "artists-ticketmaster",
      });
    } catch (error) {
      console.error("Ticketmaster suggestions search failed:", error);
      return NextResponse.json(
        {
          error: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Suggestions search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
