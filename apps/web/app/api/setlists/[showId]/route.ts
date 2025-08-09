import { type NextRequest, NextResponse } from "next/server";
import { createAuthenticatedClient } from "~/lib/supabase/server";

type RouteParams = {
  params: Promise<{
    showId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { showId } = await params;
    const supabase = await createAuthenticatedClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch setlists for the show with songs
    const { data: setlists, error } = await supabase
      .from("setlists")
      .select(
        `
        id,
        name,
        type,
        is_locked,
        order_index,
        setlist_songs (
          id,
          song_id,
          position,
          notes,
          is_played,
          play_time,
          upvotes,
          downvotes,
          net_votes,
          songs (
            id,
            title,
            artist,
            album,
            duration_ms,
            album_art_url,
            is_explicit
          )
        )
      `,
      )
      .eq("show_id", showId)
      .order("order_index");

    if (error) {
      console.error("Error fetching setlists:", error);
      return NextResponse.json(
        { error: "Failed to fetch setlists" },
        { status: 500 },
      );
    }

    // Get user votes if authenticated
    const userVotes: Record<string, "up" | "down"> = {};
    if (user && setlists && setlists.length > 0) {
      const setlistSongIds: string[] = [];
      setlists.forEach((setlist) => {
        setlist.setlist_songs?.forEach((song: any) => {
          setlistSongIds.push(song.id);
        });
      });

      if (setlistSongIds.length > 0) {
        const { data: votes } = await supabase
          .from("votes")
          .select("setlist_song_id, vote_type")
          .eq("user_id", user.id)
          .in("setlist_song_id", setlistSongIds);

        if (votes) {
          votes.forEach((vote) => {
            userVotes[vote.setlist_song_id] = vote.vote_type;
          });
        }
      }
    }

    // Transform the data to match the expected format
    const transformedSetlists =
      setlists?.map((setlist) => ({
        id: setlist.id,
        name: setlist.name,
        type: setlist.type,
        isLocked: setlist.is_locked,
        songs:
          setlist.setlist_songs
            ?.sort((a: any, b: any) => a.position - b.position)
            .map((setlistSong: any) => ({
              id: setlistSong.id,
              songId: setlistSong.song_id,
              position: setlistSong.position,
              song: {
                id: setlistSong.songs.id,
                title: setlistSong.songs.title,
                artist: setlistSong.songs.artist,
                album: setlistSong.songs.album,
                durationMs: setlistSong.songs.duration_ms,
                albumArtUrl: setlistSong.songs.album_art_url,
                isExplicit: setlistSong.songs.is_explicit,
              },
              notes: setlistSong.notes,
              isPlayed: setlistSong.is_played,
              playTime: setlistSong.play_time,
              upvotes: setlistSong.upvotes,
              downvotes: setlistSong.downvotes,
              netVotes: setlistSong.net_votes,
              userVote: userVotes[setlistSong.id] || null,
            })) || [],
      })) || [];

    return NextResponse.json({
      setlists: transformedSetlists,
    });
  } catch (error) {
    console.error("Setlist fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
