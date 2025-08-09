import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
// import { env } from '@repo/env';
import {
  searchRateLimiter,
  apiRateLimitMiddleware,
} from "~/lib/api-rate-limit";

const QuerySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters"),
});

export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await apiRateLimitMiddleware(
    req,
    searchRateLimiter,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryParam = searchParams.get("q");

    // Validate query parameter
    const result = QuerySchema.safeParse({ q: queryParam });

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid query parameter", details: result.error.issues },
        { status: 400 },
      );
    }

    const { q } = result.data;

    // Build Ticketmaster API URL
    const url = new URL(
      "https://app.ticketmaster.com/discovery/v2/attractions",
    );
    url.searchParams.append("apikey", process.env.TICKETMASTER_API_KEY!);
    url.searchParams.append("keyword", q);
    url.searchParams.append("size", "20");
    url.searchParams.append("classificationName", "music"); // Filter for music attractions only

    // Make request to Ticketmaster API with caching
    const response = await fetch(url.toString(), {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: "Upstream API error", status: response.status },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Extract and format attractions
    const attractions = data._embedded?.attractions || [];

    // Format response to match expected structure
    const formattedAttractions = attractions.map((attraction: any) => ({
      id: attraction.id,
      name: attraction.name,
      type: attraction.type,
      url: attraction.url,
      locale: attraction.locale,
      images: attraction.images,
      classifications: attraction.classifications,
      externalLinks: attraction.externalLinks,
      // Include additional useful fields
      genres: attraction.classifications?.[0]?.genre?.name,
      subGenres: attraction.classifications?.[0]?.subGenre?.name,
    }));

    return NextResponse.json({
      attractions: formattedAttractions,
      total: formattedAttractions.length,
      query: q,
    });
  } catch (error) {
    console.error("Ticketmaster search error:", error);

    return NextResponse.json(
      {
        error: "Search failed",
        attractions: [],
        total: 0,
        query: "",
      },
      { status: 500 },
    );
  }
}
