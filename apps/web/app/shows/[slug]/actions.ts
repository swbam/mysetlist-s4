"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "~/lib/auth"
import { createClient } from "~/lib/supabase/server"

export async function getShowDetails(slug: string) {
  const supabase = await createClient()

  let { data: show, error } = await supabase
    .from("shows")
    .select(`
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
    `)
    .eq("slug", slug)
    .single()

  if (error) {
    const fallback = await supabase
      .from("shows")
      .select("*")
      .eq("slug", slug)
      .single()

    if (fallback.error) {
      return null
    }

    show = fallback.data
  }

  const user = await getCurrentUser()

  return {
    ...show,
    currentUser: user,
  }
}

export async function createSetlist(
  showId: string,
  artistId: string,
  type: "predicted" | "actual",
  name = "Main Set"
) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("You must be logged in to create a setlist")
  }

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
    .single()

  if (error) {
    throw error
  }

  revalidatePath("/shows/[slug]", "page")

  return setlist
}

export async function addSongToSetlist(
  setlistId: string,
  songId: string,
  position: number,
  notes?: string
) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("You must be logged in to add songs")
  }

  // Check if user owns the setlist or is admin
  const { data: setlist } = await supabase
    .from("setlists")
    .select("created_by, is_locked")
    .eq("id", setlistId)
    .single()

  if (!setlist || (setlist.created_by !== user.id && setlist.is_locked)) {
    throw new Error("You cannot modify this setlist")
  }

  // Shift positions of existing songs
  await supabase.rpc("shift_setlist_positions", {
    setlist_id: setlistId,
    start_position: position,
  })

  // Insert the new song
  const { data, error } = await supabase
    .from("setlist_songs")
    .insert({
      setlist_id: setlistId,
      song_id: songId,
      position,
      notes,
    })
    .select(`
      *,
      song:songs(*)
    `)
    .single()

  if (error) {
    throw error
  }

  revalidatePath("/shows/[slug]", "page")

  return data
}

export async function removeSongFromSetlist(setlistSongId: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("You must be logged in to remove songs")
  }

  // Get the song details first
  const { data: setlistSong } = await supabase
    .from("setlist_songs")
    .select(`
      *,
      setlist:setlists(created_by, is_locked)
    `)
    .eq("id", setlistSongId)
    .single()

  if (
    !setlistSong ||
    (setlistSong.setlist.created_by !== user.id &&
      setlistSong.setlist.is_locked)
  ) {
    throw new Error("You cannot modify this setlist")
  }

  // Delete the song
  const { error } = await supabase
    .from("setlist_songs")
    .delete()
    .eq("id", setlistSongId)

  if (error) {
    throw error
  }

  // Reorder remaining songs
  await supabase.rpc("reorder_setlist_after_delete", {
    setlist_id: setlistSong.setlist_id,
    deleted_position: setlistSong.position,
  })

  revalidatePath("/shows/[slug]", "page")

  return { success: true }
}

export async function reorderSetlistSongs(
  setlistId: string,
  updates: { id: string; position: number }[]
) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("You must be logged in to reorder songs")
  }

  // Check permissions
  const { data: setlist } = await supabase
    .from("setlists")
    .select("created_by, is_locked")
    .eq("id", setlistId)
    .single()

  if (!setlist || (setlist.created_by !== user.id && setlist.is_locked)) {
    throw new Error("You cannot modify this setlist")
  }

  // Update all positions in a transaction
  const { error } = await supabase.rpc("bulk_update_setlist_positions", {
    updates: updates,
  })

  if (error) {
    throw error
  }

  revalidatePath("/shows/[slug]", "page")

  return { success: true }
}

export async function searchSongs(query: string, artistId?: string) {
  const supabase = await createClient()

  let queryBuilder = supabase
    .from("songs")
    .select("*")
    .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
    .limit(20)

  if (artistId) {
    // If artistId provided, prioritize songs by that artist
    queryBuilder = queryBuilder.order("artist", {
      ascending: false,
      nullsFirst: false,
    })
  }

  const { data, error } = await queryBuilder

  if (error) {
    throw error
  }

  return data || []
}

export async function voteSong(setlistSongId: string, voteType: "up" | "down") {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("You must be logged in to vote")
  }

  // Check for existing vote
  const { data: existingVote } = await supabase
    .from("votes")
    .select("id, vote_type")
    .eq("setlist_song_id", setlistSongId)
    .eq("user_id", user.id)
    .single()

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      // Remove vote if clicking the same type
      await supabase.from("votes").delete().eq("id", existingVote.id)

      return { removed: true }
    }
    // Update vote type
    await supabase
      .from("votes")
      .update({ vote_type: voteType })
      .eq("id", existingVote.id)

    return { updated: true }
  }
  // Create new vote
  await supabase.from("votes").insert({
    setlist_song_id: setlistSongId,
    user_id: user.id,
    vote_type: voteType,
  })

  return { created: true }
}

export async function lockSetlist(setlistId: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("You must be logged in to lock setlists")
  }

  // Check if user is admin or setlist creator
  const { data: setlist } = await supabase
    .from("setlists")
    .select("created_by, show:shows(date)")
    .eq("id", setlistId)
    .single()

  if (!setlist || setlist.created_by !== user.id) {
    throw new Error("You cannot lock this setlist")
  }

  // Lock the setlist
  const { error } = await supabase
    .from("setlists")
    .update({ is_locked: true })
    .eq("id", setlistId)

  if (error) {
    throw error
  }

  revalidatePath("/shows/[slug]", "page")

  return { success: true }
}
