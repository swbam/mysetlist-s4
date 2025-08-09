import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@repo/database";

interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  source: "database" | "ticketmaster" | "spotify";
  externalId?: string;
  spotifyId?: string;
  ticketmasterId?: string;
  popularity?: number;
}

// Simple Spotify search function to avoid class complexity
async function searchSpotifyArtists(query: string, limit = 5): Promise<any[]> {
  try {
    // Get Spotify access token
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env["SPOTIFY_CLIENT_ID"]}:${process.env["SPOTIFY_CLIENT_SECRET"]}`,
          ).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      },
    );

    if (!tokenResponse.ok) {
      throw new Error("Spotify authentication failed");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Search artists
    const params = new URLSearchParams({
      q: query,
      type: "artist",
      limit: limit.toString(),
    });

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!searchResponse.ok) {
      throw new Error(`Spotify search failed: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    return searchData.artists?.items || [];
  } catch (error) {
    console.warn("Spotify search failed:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({
        artists: [],
        query: query || "",
        total: 0,
      });
    }

    const supabase = createSupabaseAdminClient();
    let dbResults: Artist[] = [];

    // Search in database first
    try {
      const { data: artists, error } = await supabase
        .from("artists")
        .select(
          "id, name, slug, image_url, genres, verified, popularity, spotify_id",
        )
        .or(`name.ilike.%${query}%,name.ilike.${query}%`)
        .order("popularity", { ascending: false })
        .limit(Math.min(limit, 8));

      if (error) {
        console.error("Database search error:", error);
      } else if (artists) {
        dbResults = artists.map((artist) => ({
          id: artist.slug || artist.id,
          name: artist.name,
          imageUrl: artist.image_url || undefined,
          genres: Array.isArray(artist.genres)
            ? artist.genres
            : typeof artist.genres === "string"
              ? [artist.genres]
              : [],
          source: "database" as const,
          spotifyId: artist.spotify_id || undefined,
          popularity: artist.popularity || 0,
        }));
      }
    } catch (error) {
      console.error("Database query failed:", error);
    }

    // Keep track of artist names we already have
    const existingNames = new Set(dbResults.map((a) => a.name.toLowerCase()));

    // Search external sources if we have less than limit results
    let externalResults: Artist[] = [];

    if (dbResults.length < limit) {
      // Try Spotify search first
      try {
        if (
          process.env["SPOTIFY_CLIENT_ID"] &&
          process.env["SPOTIFY_CLIENT_SECRET"]
        ) {
          const spotifyArtists = await searchSpotifyArtists(
            query,
            Math.min(5, limit - dbResults.length),
          );

          const spotifyResults = spotifyArtists
            .filter(
              (artist: any) => !existingNames.has(artist.name.toLowerCase()),
            )
            .map((artist: any) => ({
              id: artist.id,
              name: artist.name,
              imageUrl: artist.images?.[0]?.url,
              genres: artist.genres || [],
              source: "spotify" as const,
              spotifyId: artist.id,
              popularity: artist.popularity || 0,
            }));

          externalResults = [...externalResults, ...spotifyResults];

          // Add to existing names set
          spotifyResults.forEach((r) =>
            existingNames.add(r.name.toLowerCase()),
          );
        }
      } catch (error) {
        console.warn("Spotify search failed:", error);
      }

      // Try Ticketmaster search
      try {
        if (
          process.env["TICKETMASTER_API_KEY"] &&
          externalResults.length + dbResults.length < limit
        ) {
          const remainingSlots =
            limit - dbResults.length - externalResults.length;
          const tmResponse = await searchTicketmasterAttractions(
            query,
            remainingSlots,
          );

          if (tmResponse?.attractions) {
            const tmResults = tmResponse.attractions
              .filter(
                (attraction: any) =>
                  !existingNames.has(attraction.name.toLowerCase()),
              )
              .map((attraction: any) => ({
                id: attraction.id,
                name: attraction.name,
                imageUrl: attraction.images?.[0]?.url,
                genres: attraction.classifications?.[0]?.genre
                  ? [attraction.classifications[0].genre.name]
                  : [],
                source: "ticketmaster" as const,
                externalId: attraction.id,
                ticketmasterId: attraction.id,
              }));

            externalResults = [...externalResults, ...tmResults];
          }
        }
      } catch (error) {
        console.warn("Ticketmaster search failed:", error);
      }
    }

    // Combine results, database first
    const combinedResults = [...dbResults, ...externalResults];

    return NextResponse.json({
      artists: combinedResults,
      query,
      total: combinedResults.length,
    });
  } catch (error) {
    console.error("Artist search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search artists",
        artists: [],
        query: "",
        total: 0,
      },
      { status: 500 },
    );
  }
}

// Simple Ticketmaster search function to avoid complex client imports
async function searchTicketmasterAttractions(keyword: string, size: number) {
  try {
    const apiKey = process.env["TICKETMASTER_API_KEY"];
    if (!apiKey) {
      return null;
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      keyword,
      size: size.toString(),
      classificationName: "music",
      sort: "relevance,desc",
    });

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/attractions.json?${params}`,
    );

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      attractions: data._embedded?.attractions || [],
    };
  } catch (error) {
    console.warn("Ticketmaster API call failed:", error);
    return null;
  }
}
