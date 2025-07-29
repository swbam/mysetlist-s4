import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

// Vercel function config to prevent timeouts
export const maxDuration = 10; // 10 seconds max
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ artists: [] });
    }

    const supabase = await createClient();

    // Search artists by name with fuzzy matching
    const { data: searchResults, error } = await supabase
      .from("artists")
      .select(
        `
        id,
        name,
        slug,
        image_url,
        small_image_url,
        genres,
        popularity,
        followers,
        verified,
        spotify_id
      `,
      )
      .ilike("name", `%${query}%`)
      .order("popularity", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Artist search error:", error);
      throw error;
    }

    return NextResponse.json({
      artists: searchResults || [],
      query,
      total: searchResults?.length || 0,
    });
  } catch (_error) {
    return NextResponse.json(
      {
        error: "Artist search failed",
        artists: [],
        query: "",
        total: 0,
      },
      { status: 500 },
    );
  }
}
