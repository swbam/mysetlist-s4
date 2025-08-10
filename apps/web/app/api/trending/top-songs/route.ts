import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // Get top voted songs from recent setlists
    const { data: topSongs } = await supabase
      .from("setlist_songs")
      .select(
        `
        song:songs(id, title, artist),
        votes:user_votes(count)
      `,
      )
      .order("votes", { ascending: false })
      .limit(10);

    if (!topSongs || topSongs.length === 0) {
      // Fallback: get any songs from the catalog
      const { data: anySongs } = await supabase
        .from("songs")
        .select("id, title, artist")
        .limit(4);

      if (!anySongs) {
        return NextResponse.json({ songs: [] });
      }

      return NextResponse.json({
        songs: anySongs.map((song, index) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          votes: 0,
          percentage: 100 - index * 20,
        })),
      });
    }

    // Calculate vote counts and percentages
    const songsWithVotes = await Promise.all(
      topSongs
        .filter((item) => item.song && item.song.length > 0)
        .slice(0, 4)
        .map(async (item, index) => {
          const firstSong = item.song![0];
          if (!firstSong) {
            return null;
          }
          const { count } = await supabase
            .from("user_votes")
            .select("*", { count: "exact", head: true })
            .eq("song_id", firstSong.id);

          return {
            id: firstSong.id,
            title: firstSong.title,
            artist: firstSong.artist,
            votes: count || 0,
            percentage: 100 - index * 10,
          };
        }),
    ).then((results) => results.filter((r) => r !== null));

    return NextResponse.json({
      songs: songsWithVotes,
    });
  } catch (_error) {
    return NextResponse.json({ songs: [] });
  }
}
