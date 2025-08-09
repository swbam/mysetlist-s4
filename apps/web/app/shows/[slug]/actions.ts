"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "~/lib/auth";
import { createClient } from "~/lib/supabase/server";

export async function getShowDetails(slug: string) {
  const supabase = await createClient();

  let { data: show, error } = await supabase
    .from("shows")
    .select(
      `
      *,
      headliner_artist:artists(*),
      venue:venues(*),
      show_artists(
        *,
        artist:artists(*)
      ),
      setlists(
        *,
        setlist_songs(
          *,
          song:songs(*)
        )
      )
    `,
    )
    .eq("slug", slug)
    .single();

  if (error) {
    const fallback = await supabase
      .from("shows")
      .select("*")
      .eq("slug", slug)
      .single();

    if (fallback.error) {
      return null;
    }

    show = fallback.data;
  }

  const user = await getCurrentUser();

  return {
    ...show,
    currentUser: user,
  };
}

export async function createSetlist(
  showId: string,
  artistId: string,
  type: "predicted" | "actual",
  name = "Main Set",
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to create a setlist");
  }

  // Create the setlist
  const { data: setlist, error } = await supabase
    .from("setlists")
    .insert({
      show_id: showId,
      artist_id: artistId,
      type,
      name,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Automatically add 5 random songs from artist catalog
  try {
    // First try artist_songs table
    const { data: artistSongsData } = await supabase
      .from("artist_songs")
      .select("*")
      .eq("artist_id", artistId)
      .limit(50);

    if (artistSongsData && artistSongsData.length > 0) {
      // Shuffle and pick 5 random songs
      const shuffled = artistSongsData.sort(() => 0.5 - Math.random());
      const selectedSongs = shuffled.slice(0, 5);

      // First, insert songs into the songs table if they don't exist
      for (let i = 0; i < selectedSongs.length; i++) {
        const song = selectedSongs[i];
        
        // Check if song exists in songs table
        const { data: existingSong } = await supabase
          .from("songs")
          .select("id")
          .eq("spotify_id", song.spotify_id)
          .single();

        let songId = existingSong?.id;

        if (!songId) {
          // Insert song into songs table
          const { data: newSong } = await supabase
            .from("songs")
            .insert({
              spotify_id: song.spotify_id,
              title: song.title,
              artist: song.artist_name || "Unknown Artist",
              album: song.album_name,
              album_art_url: song.album_art_url,
              duration_ms: song.duration_ms,
              popularity: song.popularity,
              preview_url: song.preview_url,
              is_explicit: song.is_explicit,
              spotify_uri: song.spotify_uri,
              external_urls: song.external_urls,
            })
            .select("id")
            .single();
          
          songId = newSong?.id;
        }

        if (songId) {
          // Add song to setlist
          await supabase
            .from("setlist_songs")
            .insert({
              setlist_id: setlist.id,
              song_id: songId,
              position: i + 1,
            });
        }
      }
    } else {
      // Fallback: Try to get songs from the songs table by artist name
      const { data: artist } = await supabase
        .from("artists")
        .select("name")
        .eq("id", artistId)
        .single();

      if (artist) {
        const { data: songsData } = await supabase
          .from("songs")
          .select("*")
          .ilike("artist", `%${artist.name}%`)
          .limit(5);

        if (songsData && songsData.length > 0) {
          for (let i = 0; i < songsData.length; i++) {
            await supabase
              .from("setlist_songs")
              .insert({
                setlist_id: setlist.id,
                song_id: songsData[i].id,
                position: i + 1,
              });
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to add initial songs to setlist:", error);
    // Don't throw - setlist was created successfully, just without initial songs
  }

  revalidatePath("/shows/[slug]", "page");

  return setlist;
}

export async function addSongToSetlist(
  setlistId: string,
  songId: string,
  position: number,
  notes?: string,
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to add songs");
  }

  // Check if user owns the setlist or is admin
  const { data: setlist } = await supabase
    .from("setlists")
    .select("created_by, is_locked")
    .eq("id", setlistId)
    .single();

  if (!setlist || (setlist.created_by !== user.id && setlist.is_locked)) {
    throw new Error("You cannot modify this setlist");
  }

  // Shift positions of existing songs
  await supabase.rpc("shift_setlist_positions", {
    setlist_id: setlistId,
    start_position: position,
  });

  // Insert the new song
  const { data, error } = await supabase
    .from("setlist_songs")
    .insert({
      setlist_id: setlistId,
      song_id: songId,
      position,
      notes,
    })
    .select(
      `
      *,
      song:songs(*)
    `,
    )
    .single();

  if (error) {
    throw error;
  }

  revalidatePath("/shows/[slug]", "page");

  return data;
}

export async function removeSongFromSetlist(setlistSongId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to remove songs");
  }

  // Get the song details first
  const { data: setlistSong } = await supabase
    .from("setlist_songs")
    .select(
      `
      *,
      setlist:setlists(created_by, is_locked)
    `,
    )
    .eq("id", setlistSongId)
    .single();

  if (
    !setlistSong ||
    (setlistSong.setlist.created_by !== user.id &&
      setlistSong.setlist.is_locked)
  ) {
    throw new Error("You cannot modify this setlist");
  }

  // Delete the song
  const { error } = await supabase
    .from("setlist_songs")
    .delete()
    .eq("id", setlistSongId);

  if (error) {
    throw error;
  }

  // Reorder remaining songs
  await supabase.rpc("reorder_setlist_after_delete", {
    setlist_id: setlistSong.setlist_id,
    deleted_position: setlistSong.position,
  });

  revalidatePath("/shows/[slug]", "page");

  return { success: true };
}

export async function reorderSetlistSongs(
  setlistId: string,
  updates: { id: string; position: number }[],
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to reorder songs");
  }

  // Check permissions
  const { data: setlist } = await supabase
    .from("setlists")
    .select("created_by, is_locked")
    .eq("id", setlistId)
    .single();

  if (!setlist || (setlist.created_by !== user.id && setlist.is_locked)) {
    throw new Error("You cannot modify this setlist");
  }

  // Update all positions in a transaction
  const { error } = await supabase.rpc("bulk_update_setlist_positions", {
    updates: updates,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/shows/[slug]", "page");

  return { success: true };
}

export async function searchSongs(query: string, artistId?: string) {
  const supabase = await createClient();

  let queryBuilder = supabase
    .from("songs")
    .select("*")
    .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
    .limit(20);

  if (artistId) {
    // If artistId provided, prioritize songs by that artist
    queryBuilder = queryBuilder.order("artist", {
      ascending: false,
      nullsFirst: false,
    });
  }

  const { data, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function voteSong(setlistSongId: string, voteType: "up") {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to vote");
  }

  // Check for existing vote
  const { data: existingVote } = await supabase
    .from("votes")
    .select("id, vote_type")
    .eq("setlist_song_id", setlistSongId)
    .eq("user_id", user.id)
    .single();

  if (existingVote) {
    // Remove vote if already upvoted (toggle behavior)
    await supabase.from("votes").delete().eq("id", existingVote.id);
    return { removed: true };
  }
  
  // Create new upvote
  await supabase.from("votes").insert({
    setlist_song_id: setlistSongId,
    user_id: user.id,
    vote_type: "up", // Only upvoting allowed
  });

  return { created: true };
}

export async function lockSetlist(setlistId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to lock setlists");
  }

  // Check if user is admin or setlist creator
  const { data: setlist } = await supabase
    .from("setlists")
    .select("created_by, show:shows(date)")
    .eq("id", setlistId)
    .single();

  if (!setlist || setlist.created_by !== user.id) {
    throw new Error("You cannot lock this setlist");
  }

  // Lock the setlist
  const { error } = await supabase
    .from("setlists")
    .update({ is_locked: true })
    .eq("id", setlistId);

  if (error) {
    throw error;
  }

  revalidatePath("/shows/[slug]", "page");

  return { success: true };
}
