import { createSupabaseAdminClient } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

interface SearchResult {
  id: string;
  type: "artist" | "show" | "venue" | "song";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  date?: string;
  verified?: boolean;
  source: "database";
  location?: string;
  artistName?: string;
  venueName?: string;
  popularity?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Number.parseInt(searchParams.get("limit") || "8", 10);
    const types = searchParams.get("types")?.split(",") || [
      "artist",
      "show",
      "venue",
      "song",
    ];

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = createSupabaseAdminClient();
    const results: SearchResult[] = [];

    // Search Artists (database only)
    if (types.includes("artist")) {
      try {
        const { data: artists, error } = await supabase
          .from("artists")
          .select("id, name, slug, image_url, genres, verified, popularity")
          .ilike("name", `%${query}%`)
          .order("popularity", { ascending: false })
          .limit(Math.min(limit, 3));

        if (!error && artists) {
          results.push(
            ...artists.map(
              (artist): SearchResult => ({
                id: artist.id,
                type: "artist",
                title: artist.name,
                subtitle: Array.isArray(artist.genres)
                  ? artist.genres.slice(0, 2).join(", ")
                  : "Artist",
                imageUrl: artist.image_url,
                slug: artist.slug,
                verified: artist.verified,
                popularity: artist.popularity,
                source: "database",
              }),
            ),
          );
        }
      } catch (error) {
        console.warn("Artist search error:", error);
      }
    }

    // Search Shows
    if (types.includes("show")) {
      try {
        const { data: shows, error } = await supabase
          .from("shows")
          .select(
            `
            id,
            slug,
            date,
            name,
            status,
            headliner_artist_id,
            venue_id
          `,
          )
          .ilike("name", `%${query}%`)
          .order("date", { ascending: true })
          .limit(Math.min(limit, 3));

        if (!error && shows && shows.length > 0) {
          // Fetch artist and venue details for the shows
          const artistIds = [
            ...new Set(shows.map((s) => s.headliner_artist_id).filter(Boolean)),
          ];
          const venueIds = [
            ...new Set(shows.map((s) => s.venue_id).filter(Boolean)),
          ];

          const [artistsData, venuesData] = await Promise.all([
            artistIds.length > 0
              ? supabase
                  .from("artists")
                  .select("id, name, image_url")
                  .in("id", artistIds)
              : { data: [] },
            venueIds.length > 0
              ? supabase
                  .from("venues")
                  .select("id, name, city, state, country")
                  .in("id", venueIds)
              : { data: [] },
          ]);

          const artistsMap = new Map(
            (artistsData.data || []).map((a) => [a.id, a]),
          );
          const venuesMap = new Map(
            (venuesData.data || []).map((v) => [v.id, v]),
          );

          results.push(
            ...shows.map((show): SearchResult => {
              const artist = show.headliner_artist_id
                ? artistsMap.get(show.headliner_artist_id)
                : null;
              const venue = show.venue_id ? venuesMap.get(show.venue_id) : null;
              return {
                id: show.id,
                type: "show",
                title:
                  show.name ||
                  (artist ? `${artist.name} Live` : "Unknown Show"),
                subtitle: venue
                  ? `${venue.name}, ${venue.city} • ${new Date(show.date).toLocaleDateString()}`
                  : new Date(show.date).toLocaleDateString(),
                imageUrl: artist?.image_url || undefined,
                slug: show.slug,
                date: show.date,
                artistName: artist?.name,
                venueName: venue?.name,
                location: venue
                  ? `${venue.city}, ${venue.state || venue.country}`
                  : "Unknown Location",
                source: "database",
              };
            }),
          );
        }
      } catch (error) {
        console.warn("Shows search error:", error);
      }
    }

    // Search Venues
    if (types.includes("venue")) {
      try {
        const { data: venues, error } = await supabase
          .from("venues")
          .select("id, slug, name, city, state, country, capacity")
          .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
          .order("capacity", { ascending: false })
          .limit(Math.min(limit, 2));

        if (!error && venues) {
          results.push(
            ...venues.map(
              (venue): SearchResult => ({
                id: venue.id,
                type: "venue",
                title: venue.name,
                subtitle: `${venue.city}, ${venue.state || venue.country}${venue.capacity ? ` • Capacity: ${venue.capacity}` : ""}`,
                slug: venue.slug,
                location: `${venue.city}, ${venue.state || venue.country}`,
                source: "database",
              }),
            ),
          );
        }
      } catch (error) {
        console.warn("Venues search error:", error);
      }
    }

    // Search Songs
    if (types.includes("song")) {
      try {
        const { data: songs, error } = await supabase
          .from("songs")
          .select(
            `
            id,
            title,
            artist,
            album,
            spotify_id,
            duration_ms,
            popularity
          `,
          )
          .ilike("title", `%${query}%`)
          .order("popularity", { ascending: false })
          .limit(Math.min(limit, 2));

        if (!error && songs) {
          results.push(
            ...songs.map(
              (song): SearchResult => ({
                id: song.id,
                type: "song",
                title: song.title,
                subtitle: song.artist ? `by ${song.artist}` : "Unknown Artist",
                artistName: song.artist || "Unknown Artist",
                source: "database",
              }),
            ),
          );
        }
      } catch (error) {
        console.warn("Songs search error:", error);
      }
    }

    // Sort results by relevance and type priority
    const sortedResults = results.sort((a, b) => {
      // Type priority: artists first, then shows, venues, songs
      const typePriority = { artist: 4, show: 3, venue: 2, song: 1 };
      const aPriority = typePriority[a.type] || 0;
      const bPriority = typePriority[b.type] || 0;

      if (aPriority !== bPriority) return bPriority - aPriority;

      // Verified/database results first
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;

      // Exact match
      const aExact = a.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      const bExact = b.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // Popularity
      return (b.popularity || 0) - (a.popularity || 0);
    });

    return NextResponse.json({
      results: sortedResults.slice(0, limit),
      total: sortedResults.length,
      query,
      source: "database-only",
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
        results: [],
        total: 0,
      },
      { status: 500 },
    );
  }
}
