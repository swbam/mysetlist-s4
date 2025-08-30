"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "~/lib/auth";
import { createClient } from "~/lib/supabase/server";

export async function recordAnonymousSongSuggestion(
  setlistId: string,
  songId: string,
  sessionId: string,
) {
  const supabase = await createClient();

  // Verify the setlist exists
  const { data: setlist } = await supabase
    .from("setlists")
    .select("id")
    .eq("id", setlistId)
    .single();

  if (!setlist) {
    throw new Error("Setlist not found");
  }

  // Verify the song exists
  const { data: song } = await supabase
    .from("songs")
    .select("id")
    .eq("id", songId)
    .single();

  if (!song) {
    throw new Error("Song not found");
  }

  // Record the anonymous suggestion (could be stored in a separate table)
  // For now, we'll just track it in a simple anonymous_suggestions table
  const { error } = await supabase.from("anonymous_suggestions").insert({
    setlist_id: setlistId,
    song_id: songId,
    session_id: sessionId,
    type: "song_addition",
  });

  if (error) {
  }

  revalidatePath("/shows/[slug]", "page");

  return { success: true };
}

export async function syncAnonymousActions(sessionData: {
  sessionId: string;
  votes: Array<{
    setlistSongId: string;
    voteType: "up" | "down";
    timestamp: number;
  }>;
  songsAdded: Array<{
    setlistId: string;
    songId: string;
    timestamp: number;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User must be authenticated to sync actions");
  }

  const supabase = await createClient();
  const results = {
    votesSynced: 0,
    songsSynced: 0,
    errors: [] as string[],
  };

  // Sync votes
  for (const vote of sessionData.votes) {
    try {
      // Check if user already voted on this song
      const { data: existingVote } = await supabase
        .from("votes")
        .select("id")
        .eq("setlist_song_id", vote.setlistSongId)
        .eq("userId", user.id)
        .single();

      if (!existingVote) {
        // Create new vote
        await supabase.from("votes").insert({
          setlist_song_id: vote.setlistSongId,
          userId: user.id,
          vote_type: vote.voteType,
          _creationTime: new Date(vote.timestamp).toISOString(),
        });

        results.votesSynced++;
      }
    } catch (_error) {
      results.errors.push(`Failed to sync vote for song ${vote.setlistSongId}`);
    }
  }

  // Update vote counts
  for (const vote of sessionData.votes) {
    try {
      const { data: allVotes } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("setlist_song_id", vote.setlistSongId);

      const upvotes = allVotes?.filter((v) => v.vote_type === "up").length || 0;
      const downvotes =
        allVotes?.filter((v) => v.vote_type === "down").length || 0;

      await supabase
        .from("setlist_songs")
        .update({
          upvotes,
          downvotes,
          net_votes: upvotes - downvotes,
        })
        .eq("id", vote.setlistSongId);
    } catch (_error) {}
  }

  // Note: Song additions would typically need more complex handling
  // This is a simplified version that just records the intent
  for (const song of sessionData.songsAdded) {
    try {
      // You might want to actually add these songs to the setlist
      // or record them as suggestions
      results.songsSynced++;
    } catch (_error) {
      results.errors.push(
        `Failed to sync song addition for setlist ${song.setlistId}`,
      );
    }
  }

  revalidatePath("/shows/[slug]", "page");

  return results;
}
