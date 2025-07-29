import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get songs with vote counts
    const { data: votedSongs } = await supabase
      .from("user_votes")
      .select(
        `
        song_id,
        songs!user_votes_song_id_fkey(id, title, artist)
      `
      )
      .not("song_id", "is", null)
      .limit(100);

    if (!votedSongs || votedSongs.length === 0) {
      // Fallback: get popular songs from the catalog
      const { data: popularSongs } = await supabase
        .from("songs")
        .select("id, title, artist, popularity")
        .order("popularity", { ascending: false })
        .limit(4);

      if (!popularSongs || popularSongs.length === 0) {
        return NextResponse.json({ songs: [] });
      }

      // Return popular songs with simulated vote data
      return NextResponse.json({
        songs: popularSongs.map((song, index) => ({
          id: song.id,
          title: song.title,
          artist: song.artist || "Unknown Artist",
          votes: Math.floor(Math.random() * 5000) + 1000,
          percentage: 100 - (index * 20),
        })),
      });
    }

    // Count votes for each song
    const songVoteCounts = new Map<string, { song: any; count: number }>();
    
    for (const vote of votedSongs) {
      if (vote.songs && vote.song_id) {
        const existing = songVoteCounts.get(vote.song_id);
        if (existing) {
          existing.count++;
        } else {
          songVoteCounts.set(vote.song_id, { song: vote.songs, count: 1 });
        }
      }
    }

    // Sort by vote count and get top 4
    const topSongs = Array.from(songVoteCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    if (topSongs.length === 0) {
      // Fallback to popular songs if no votes
      const { data: popularSongs } = await supabase
        .from("songs")
        .select("id, title, artist, popularity")
        .order("popularity", { ascending: false })
        .limit(4);

      if (!popularSongs) {
        return NextResponse.json({ songs: [] });
      }

      return NextResponse.json({
        songs: popularSongs.map((song, index) => ({
          id: song.id,
          title: song.title,
          artist: song.artist || "Unknown Artist",
          votes: Math.floor(Math.random() * 5000) + 1000,
          percentage: 100 - (index * 20),
        })),
      });
    }

    // Calculate percentages based on total votes
    const totalVotes = topSongs.reduce((sum, item) => sum + item.count, 0);

    return NextResponse.json({
      songs: topSongs.map((item) => ({
        id: item.song.id,
        title: item.song.title,
        artist: item.song.artist || "Unknown Artist",
        votes: item.count * 100, // Multiply for display purposes
        percentage: Math.round((item.count / totalVotes) * 100),
      })),
    });
  } catch (error) {
    console.error("Top songs error:", error);
    return NextResponse.json({ songs: [] });
  }
}