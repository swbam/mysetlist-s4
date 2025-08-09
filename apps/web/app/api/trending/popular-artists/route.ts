import { createServiceClient } from "~/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // Get popular artists based on trending score and popularity
    const { data: popularArtists } = await supabase
      .from("artists")
      .select("name, slug")
      .gt("trending_score", 0)
      .order("trending_score", { ascending: false })
      .order("popularity", { ascending: false })
      .limit(10);

    if (!popularArtists || popularArtists.length === 0) {
      // Fallback: get any verified artists
      const { data: anyArtists } = await supabase
        .from("artists")
        .select("name, slug")
        .eq("verified", true)
        .order("followers", { ascending: false })
        .limit(4);

      return NextResponse.json({
        artists: anyArtists?.map((a) => a.name) || [],
      });
    }

    return NextResponse.json({
      artists: popularArtists.slice(0, 4).map((artist) => artist.name),
    });
  } catch (_error) {
    return NextResponse.json({ artists: [] });
  }
}
