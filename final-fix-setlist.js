import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function finalFixSetlist() {
  try {
    // Get Arctic Monkeys show
    const { data: show } = await supabase
      .from("shows")
      .select("id, name, slug, headliner_artist_id")
      .eq("slug", "arctic-monkeys-inglewood-2025-08-10")
      .single();

    console.log("Working on show:", show.name);

    // Get setlist for this show
    const { data: setlist } = await supabase
      .from("setlists")
      .select("id")
      .eq("show_id", show.id)
      .single();

    console.log("Found setlist:", setlist.id);

    // Step 1: Delete all votes for this setlist's songs
    const { data: setlistSongIds } = await supabase
      .from("setlist_songs")
      .select("id")
      .eq("setlist_id", setlist.id);

    if (setlistSongIds && setlistSongIds.length > 0) {
      const ids = setlistSongIds.map((s) => s.id);
      const { error: voteDeleteError } = await supabase
        .from("votes")
        .delete()
        .in("setlist_song_id", ids);

      if (voteDeleteError) {
        console.error("Error deleting votes:", voteDeleteError);
      } else {
        console.log("Cleared existing votes");
      }
    }

    // Step 2: Delete all existing setlist_songs
    const { error: deleteError } = await supabase
      .from("setlist_songs")
      .delete()
      .eq("setlist_id", setlist.id);

    if (deleteError) {
      console.error("Error deleting setlist songs:", deleteError);
      return;
    }
    console.log("Cleared existing setlist songs");

    // Step 3: Get the real Arctic Monkeys songs we created
    const realArcticMonkeysTitles = [
      "R U Mine?",
      "Do I Wanna Know?",
      "Brianstorm",
      "505",
      "Fluorescent Adolescent",
      "Why'd You Only Call Me When You're High?",
      "I Bet You Look Good on the Dancefloor",
      "When the Sun Goes Down",
      "Arabella",
      "Snap Out of It",
      "Teddy Picker",
      "Crying Lightning",
      "Cornerstone",
      "Mardy Bum",
      "Four Out of Five",
      "One Point Perspective",
      "American Sports",
      "The View from the Afternoon",
      "Pretty Visitors",
      "Body Paint",
    ];

    const { data: arcticSongs } = await supabase
      .from("songs")
      .select("id, title")
      .eq("artist", "Arctic Monkeys")
      .in("title", realArcticMonkeysTitles);

    console.log(`Found ${arcticSongs?.length || 0} real Arctic Monkeys songs`);

    if (!arcticSongs || arcticSongs.length === 0) {
      console.log(
        "No Arctic Monkeys songs found. Please run the previous script first.",
      );
      return;
    }

    // Step 4: Create a realistic setlist order (based on their typical concerts)
    const setlistOrder = [
      "The View from the Afternoon", // Opener
      "Brianstorm",
      "Snap Out of It",
      "Crying Lightning",
      "Why'd You Only Call Me When You're High?",
      "Teddy Picker",
      "Fluorescent Adolescent",
      "Cornerstone",
      "When the Sun Goes Down",
      "Pretty Visitors",
      "Four Out of Five",
      "One Point Perspective",
      "American Sports",
      "Arabella",
      "Do I Wanna Know?",
      // Encore
      "505",
      "Mardy Bum",
      "Body Paint",
      "I Bet You Look Good on the Dancefloor",
      "R U Mine?", // Closer
    ];

    // Step 5: Insert songs in proper order
    const setlistSongs = [];
    let position = 1;

    for (const songTitle of setlistOrder) {
      const song = arcticSongs.find((s) => s.title === songTitle);

      if (song) {
        let notes = null;
        if (position === 1) notes = "Opener";
        else if (position === 16) notes = "Encore begins";
        else if (position === 20) notes = "Closer";

        setlistSongs.push({
          setlist_id: setlist.id,
          song_id: song.id,
          position: position,
          notes: notes,
          is_played: false,
          upvotes: Math.floor(50 + Math.random() * 150), // 50-200 upvotes
          downvotes: Math.floor(Math.random() * 30), // 0-30 downvotes
          net_votes: 0, // Will calculate
        });
        position++;
      } else {
        console.log(`Warning: Song not found: ${songTitle}`);
      }
    }

    // Calculate net votes
    setlistSongs.forEach((s) => {
      s.net_votes = s.upvotes - s.downvotes;
    });

    // Step 6: Insert all setlist songs
    const { data: insertedSongs, error: insertError } = await supabase
      .from("setlist_songs")
      .insert(setlistSongs)
      .select("*");

    if (insertError) {
      console.error("Error inserting setlist songs:", insertError);
      return;
    }

    console.log(`Successfully added ${insertedSongs.length} songs to setlist`);

    // Step 7: Update setlist metadata
    await supabase
      .from("setlists")
      .update({
        type: "predicted",
        name: "Fan Predicted Setlist",
        total_votes: 342, // Realistic vote count
        accuracy_score: 88, // High confidence
        is_locked: false,
      })
      .eq("id", setlist.id);

    console.log("Setlist metadata updated!");

    // Step 8: Verify the final result
    const { data: finalSetlist } = await supabase
      .from("setlist_songs")
      .select(`
        position,
        notes,
        upvotes,
        downvotes,
        net_votes,
        songs (
          title,
          artist,
          duration_ms
        )
      `)
      .eq("setlist_id", setlist.id)
      .order("position");

    console.log("\n================================================");
    console.log("   ARCTIC MONKEYS - THE FORUM - SETLIST");
    console.log("================================================");

    let totalDuration = 0;
    finalSetlist?.forEach((item) => {
      const notes = item.notes ? ` [${item.notes}]` : "";
      const votes = `(+${item.upvotes}/-${item.downvotes})`;
      console.log(
        `${String(item.position).padStart(2)}. ${item.songs?.title}${notes} ${votes}`,
      );
      if (item.songs?.duration_ms) {
        totalDuration += item.songs.duration_ms;
      }
    });

    const minutes = Math.floor(totalDuration / 60000);
    console.log(`\nTotal Duration: ~${minutes} minutes`);
    console.log("Total Votes: 342");
    console.log("Confidence: 88%");
    console.log("================================================\n");
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

finalFixSetlist();
