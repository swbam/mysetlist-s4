import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";

const ticketmaster = new TicketmasterClient({
  apiKey: process.env["TICKETMASTER_API_KEY"]!,
});

interface SearchResult {
  id: string;
  type: "artist";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  verified?: boolean;
  source: "ticketmaster";
  requiresSync?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Number.parseInt(searchParams.get("limit") || "8", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    if (!process.env["TICKETMASTER_API_KEY"]) {
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

      const ticketmasterArtists =
        ticketmasterResponse._embedded?.attractions || [];

      const results: SearchResult[] = ticketmasterArtists.map((attraction) => ({
        id: attraction.id,
        type: "artist" as const,
        title: attraction.name,
        subtitle:
          attraction.classifications
            ?.map((c: any) => c.genre?.name)
            .filter(Boolean)
            .join(", ") || "",
        imageUrl: attraction.images?.[0]?.url || undefined,
        slug: attraction.id, // Use Ticketmaster ID as slug
        verified: false,
        source: "ticketmaster" as const,
        requiresSync: true,
      }));

      return NextResponse.json({ results });
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
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
