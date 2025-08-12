import { TicketmasterClient } from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ticketmaster = new TicketmasterClient({
  apiKey: process.env.TICKETMASTER_API_KEY || "",
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const size = Number.parseInt(searchParams.get("limit") || "8", 10);

    if (!q || q.length < 2) {
      return NextResponse.json({ artists: [] }, { status: 200 });
    }

    const resp = await ticketmaster.searchAttractions({
      keyword: q,
      size,
      classificationName: "music",
      sort: "relevance,desc",
    });

    const attractions = resp._embedded?.attractions || [];

    const artists = attractions.map((a: any) => ({
      tmAttractionId: a.id as string,
      name: a.name as string,
      image: (a.images?.find((img: any) => img.width >= 300 && img.height >= 300)?.url || a.images?.[0]?.url) as string | undefined,
      genreHints: Array.from(
        new Set(
          (a.classifications || [])
            .map((c: any) => [c.genre?.name, c.subGenre?.name])
            .flat()
            .filter(Boolean)
        ),
      ) as string[],
    }));

    return NextResponse.json({ artists }, { status: 200 });
  } catch (error) {
    console.error("/api/search/artists error", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}