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
      return NextResponse.json(
        { error: "You must be signed in to sync anonymous votes" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { sessionId, votes, songsAdded = [] } = body;

    if (!sessionId || !Array.isArray(votes)) {
      return NextResponse.json(
        { error: "Invalid request: sessionId and votes array are required" },
        { status: 400 }
      );
    }

    const results = {
      votesSynced: 0,
      songsSynced: 0,
      errors: [] as string[],
    };

    // Sync votes to the database
    for (const vote of votes) {
      try {
        // Validate vote structure
        if (!vote.setlistSongId || !vote.voteType || !vote.timestamp) {
          results.errors.push("Invalid vote structure");
          continue;
        }

        // Check if user already voted on this song
        const { data: existingVote } = await supabase
          .from("votes")
          .select("id, vote_type")
          .eq("setlist_song_id", vote.setlistSongId)
          .eq("user_id", user.id)
          .single();

        if (!existingVote) {
          // Create new vote with timestamp from anonymous session
          const { error: insertError } = await supabase
            .from("votes")
            .insert({
              setlist_song_id: vote.setlistSongId,
              user_id: user.id,
              vote_type: vote.voteType,
              created_at: new Date(vote.timestamp).toISOString(),
            });

          if (!insertError) {
            results.votesSynced++;
          } else {
            results.errors.push(
              `Failed to sync vote for song ${vote.setlistSongId}: ${insertError.message}`
            );
          }
        }
        // If user already voted, keep their authenticated vote (don't overwrite)
      } catch (error) {
        results.errors.push(
          `Failed to process vote for song ${vote.setlistSongId}`
        );
      }
    }

    // Update vote counts for affected setlist songs
    const setlistSongIds = votes.map((v: any) => v.setlistSongId);
    const uniqueSetlistSongIds = [...new Set(setlistSongIds)];

    for (const setlistSongId of uniqueSetlistSongIds) {
      try {
        // Get updated vote counts
        const { data: allVotes } = await supabase
          .from("votes")
          .select("vote_type")
          .eq("setlist_song_id", setlistSongId);

        const upvotes = allVotes?.filter((v) => v.vote_type === "up").length || 0;
        const downvotes = allVotes?.filter((v) => v.vote_type === "down").length || 0;
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
      } catch (error) {
        // Non-critical error, don't add to results.errors
        console.warn(`Failed to update vote counts for song ${setlistSongId}`);
      }
    }

    // Handle songs added (future feature - simplified for now)
    results.songsSynced = songsAdded.length;

    // Log successful sync for analytics
    try {
      await supabase
        .from("user_actions")
        .insert({
          user_id: user.id,
          action: "sync_anonymous_votes",
          metadata: {
            session_id: sessionId,
            votes_synced: results.votesSynced,
            songs_synced: results.songsSynced,
          },
        });
    } catch {
      // Non-critical logging error
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Anonymous vote sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}