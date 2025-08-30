"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "~/lib/auth";
import { createConvexClient } from "~/lib/database";
import { api } from "~/lib/convex-api";

export async function getShowDetails(slug: string) {
  const convex = createConvexClient();
  const user = await getCurrentUser();

  // Get show by slug using Convex
  const show = await convex.query(api.shows.getBySlug, { slug });

  if (error) {
    const fallback = await supabase
      api.shows
      .select("*")
      .eq("slug", slug)
      .single();

    if (fallback.error) {
      return null;
    }

    show = fallback.data;
  }

  if (!show) return null;

  // Ensure a predicted setlist exists (autonomous preseed per GROK.md)
  try {
    const { data: existingSetlists } = await supabase
      .from("setlists")
      .select("id, type")
      .eq("showId", show.id);

    const hasPredicted = (existingSetlists || []).some((s: any) => s.type === "predicted");

    if (!hasPredicted && show.headliner_artist?.id) {
      const result = await setlistPreseeder.createInitialSetlistForShow(show.id, {
        songsPerSetlist: 5,
        weightByPopularity: true,
        excludeLive: true,
      });

      if (result?.success) {
        // Re-fetch show setlists after preseed
        await revalidatePath("/shows/[slug]", "page");
      }
    }
  } catch (_e) {
    // best-effort; continue without blocking page
  }

  // Get setlists with detailed song information and vote counts
  const { data: setlists } = await supabase
    .from("setlists")
    .select(
      `
      *,
      setlist_songs(
        *,
        song:songs(*),
        votes(
          id,
          userId
        )
      )
    `,
    )
    .eq("showId", show.id)
    .order("order_index", { ascending: true });

  // Process setlists to calculate vote counts and separate by type
  const processedSetlists = (setlists || []).map((setlist) => {
    const processedSongs = (setlist.setlist_songs || []).map((setlistSong) => {
      const votes = setlistSong.votes || [];
      const upvotes = votes.length; // All votes are upvotes in simplified system
      const userVote =
        user && votes.some((v) => v.userId === user.id) ? "up" : null;

      return {
        ...setlistSong,
        upvotes,
        downvotes: 0, // No downvotes in simplified system
        netVotes: upvotes,
        userVote,
      };
    });

    return {
      ...setlist,
      setlist_songs: processedSongs,
    };
  });

  // Separate actual and predicted setlists
  const actualSetlists = processedSetlists.filter((s) => s.type === "actual");
  const predictedSetlists = processedSetlists.filter(
    (s) => s.type === "predicted",
  );

  return {
    ...show,
    setlists: processedSetlists,
    actualSetlists,
    predictedSetlists,
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
      showId: showId,
      artistId: artistId,
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
    // Get songs via artist_songs junction table
    const { data: artistSongsData } = await supabase
      .from("artist_songs")
      .select(`
        song_id,
        songs (
          id,
          spotify_id,
          name,
          artist,
          album_name,
          album_art_url,
          duration_ms,
          popularity,
          preview_url,
          is_explicit,
          spotify_uri,
          external_urls
        )
      `)
      .eq("artistId", artistId)
      .limit(50);

    if (artistSongsData && artistSongsData.length > 0) {
      // Filter out songs without full data and shuffle
      const validSongs = artistSongsData.filter(item => item.songs && (item.songs as any).id);
      const shuffled = validSongs.sort(() => 0.5 - Math.random());
      const selectedSongs = shuffled.slice(0, 5);

      // Add songs to setlist
      for (let i = 0; i < selectedSongs.length; i++) {
        const songData = selectedSongs[i]?.songs as any;
        if (songData?.id) {
          await supabase.from("setlist_songs").insert({
            setlist_id: setlist.id,
            song_id: songData.id,
            position: i + 1,
          });
        }
      }
    } else {
      // Fallback: Try to get songs from the songs table by artist name
      const { data: artist } = await supabase
        api.artists
        .select("name")
        .eq("id", artistId)
        .single();

      if (artist) {
        const { data: songsData } = await supabase
          .from("songs")
          .select("*")
          .ilike("artist", `%${artist.name}%`)
          .order("popularity", { ascending: false })
          .limit(5);

        if (songsData && songsData.length > 0) {
          for (let i = 0; i < songsData.length; i++) {
            await supabase.from("setlist_songs").insert({
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
    .select("id")
    .eq("setlist_song_id", setlistSongId)
    .eq("userId", user.id)
    .single();

  if (existingVote) {
    // Remove vote if already upvoted (toggle behavior)
    await supabase.from("votes").delete().eq("id", existingVote.id);
    return { removed: true };
  }

  // Create new upvote (simplified system - presence = upvote)
  await supabase.from("votes").insert({
    setlist_song_id: setlistSongId,
    userId: user.id,
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

export async function importActualSetlistFromSetlistFm(showId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in to import setlists");
  }

  const supabase = await createClient();

  // Get show details
  const { data: show } = await supabase
    api.shows
    .select(`
      *,
      headliner_artist:artists(*),
      venue:venues(*)
    `)
    .eq("id", showId)
    .single();

  if (!show) {
    throw new Error("Show not found");
  }

  const showDate = new Date(show.date);
  const now = new Date();

  // Only allow importing for past shows
  if (showDate >= now) {
    throw new Error("Can only import setlists for past shows");
  }

  // Check if actual setlist already exists
  const { data: existingActualSetlist } = await supabase
    .from("setlists")
    .select("id")
    .eq("showId", showId)
    .eq("type", "actual")
    .single();

  if (existingActualSetlist) {
    throw new Error("Actual setlist already exists for this show");
  }

  // Try to import from SetlistFM using the setlist sync service
  try {
    const { SetlistSyncService } = await import("@repo/external-apis");
    const syncService = new SetlistSyncService();

    await syncService.syncSetlistByShowId(showId);

    // Check if setlist was successfully imported
    const { data: importedSetlist } = await supabase
      .from("setlists")
      .select("*")
      .eq("showId", showId)
      .eq("type", "actual")
      .single();

    if (importedSetlist) {
      revalidatePath("/shows/[slug]", "page");
      return {
        success: true,
        message: "Actual setlist imported successfully from Setlist.fm",
        setlist: importedSetlist,
      };
    }
    return {
      success: false,
      message: "No matching setlist found on Setlist.fm for this show",
    };
  } catch (error) {
    console.error("Failed to import setlist:", error);
    return {
      success: false,
      message: "Failed to import setlist from Setlist.fm",
    };
  }
}
