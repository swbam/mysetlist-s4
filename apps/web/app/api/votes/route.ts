import { type NextRequest, NextResponse } from "next/server";
import { createAuthenticatedClient } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { setlistSongId, voteType } = body;

    // Validate setlistSongId
    if (!setlistSongId || typeof setlistSongId !== "string") {
      return NextResponse.json(
        {
          error:
            "Invalid request: setlistSongId is required and must be a string",
        },
        { status: 400 },
      );
    }

    // Validate voteType
    if (!["up", "down", null].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid request: voteType must be "up", "down", or null' },
        { status: 400 },
      );
    }

    // Check if user has already voted on this song
    const { data: existingVote } = await supabase
      .from("votes")
      .select("*")
      .eq("user_id", user.id)
      .eq("setlist_song_id", setlistSongId)
      .single();

    if (voteType === null) {
      // Remove vote
      if (existingVote) {
        await supabase
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("setlist_song_id", setlistSongId);
      }
    } else if (existingVote) {
      // Update existing vote
      await supabase
        .from("votes")
        .update({
          vote_type: voteType,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("setlist_song_id", setlistSongId);
    } else {
      // Create new vote
      await supabase.from("votes").insert({
        user_id: user.id,
        setlist_song_id: setlistSongId,
        vote_type: voteType,
      });
    }

    // Get updated vote counts
    const { data: allVotes } = await supabase
      .from("votes")
      .select("vote_type")
      .eq("setlist_song_id", setlistSongId);

    const upvotes = allVotes?.filter((v) => v.vote_type === "up").length || 0;
    const downvotes =
      allVotes?.filter((v) => v.vote_type === "down").length || 0;
    const netVotes = upvotes - downvotes;

    // Update vote counts on setlist_songs table
    await supabase
      .from("setlist_songs")
      .update({
        upvotes,
        downvotes,
        net_votes: netVotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setlistSongId);

    return NextResponse.json({
      success: true,
      userVote: voteType,
      upvotes,
      downvotes,
      netVotes,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient();
    const { searchParams } = new URL(request.url);
    const setlistSongId = searchParams.get("setlistSongId");

    if (!setlistSongId) {
      return NextResponse.json(
        { error: "Missing setlistSongId parameter" },
        { status: 400 },
      );
    }

    // Get vote counts
    const { data: song } = await supabase
      .from("setlist_songs")
      .select("upvotes, downvotes, net_votes")
      .eq("id", setlistSongId)
      .single();

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Get user's vote if authenticated
    let userVote: "up" | "down" | null = null;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: vote } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("user_id", user.id)
        .eq("setlist_song_id", setlistSongId)
        .single();

      userVote = vote?.vote_type || null;
    }

    return NextResponse.json({
      ...song,
      userVote,
    });
  } catch (error) {
    console.error("Get vote error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
