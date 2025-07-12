import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { setlistSongs, setlists, songs, votes } from '../schema';

export async function getSetlistsByShowId(showId: string) {
  const results = await db
    .select({
      setlist: setlists,
      songCount: sql<number>`(
        SELECT COUNT(*)
        FROM setlist_songs ss
        WHERE ss.setlist_id = ${setlists.id}
      )`,
    })
    .from(setlists)
    .where(eq(setlists.showId, showId))
    .orderBy(asc(setlists.orderIndex));

  return results;
}

export async function getSetlistWithSongs(setlistId: string, userId?: string) {
  const setlistData = await db
    .select({
      setlist: setlists,
      setlistSong: setlistSongs,
      song: songs,
    })
    .from(setlists)
    .leftJoin(setlistSongs, eq(setlists.id, setlistSongs.setlistId))
    .leftJoin(songs, eq(setlistSongs.songId, songs.id))
    .where(eq(setlists.id, setlistId))
    .orderBy(asc(setlistSongs.position));

  if (setlistData.length === 0) {
    return null;
  }

  // Get user votes if authenticated
  const userVotes: Record<string, 'up' | 'down'> = {};
  if (userId) {
    const setlistSongIds = setlistData
      .filter((row): row is typeof row & { setlistSong: NonNullable<typeof row.setlistSong> } => row.setlistSong !== null)
      .map((row) => row.setlistSong.id);

    if (setlistSongIds.length > 0) {
      const voteData = await db
        .select({
          setlistSongId: votes.setlistSongId,
          voteType: votes.voteType,
        })
        .from(votes)
        .where(
          and(
            eq(votes.userId, userId),
            inArray(votes.setlistSongId, setlistSongIds)
          )
        );

      voteData.forEach((vote) => {
        userVotes[vote.setlistSongId] = vote.voteType;
      });
    }
  }

  // Construct the result
  const setlist = setlistData[0].setlist;
  const songList = setlistData
    .filter((row): row is typeof row & { setlistSong: NonNullable<typeof row.setlistSong>; song: NonNullable<typeof row.song> } => 
      row.setlistSong !== null && row.song !== null
    )
    .map((row) => ({
      id: row.setlistSong.id,
      songId: row.song.id,
      position: row.setlistSong.position,
      song: {
        id: row.song.id,
        title: row.song.title,
        artist: row.song.artist,
        durationMs: row.song.durationMs,
        albumArtUrl: row.song.albumArtUrl,
      },
      notes: row.setlistSong.notes,
      isPlayed: row.setlistSong.isPlayed,
      playTime: row.setlistSong.playTime,
      upvotes: row.setlistSong.upvotes,
      downvotes: row.setlistSong.downvotes,
      netVotes: row.setlistSong.netVotes,
      userVote: userVotes[row.setlistSong.id] || null,
    }));

  return {
    ...setlist,
    songs: songList,
  };
}

export async function createSetlist(
  showId: string,
  setlistData: {
    name: string;
    type: 'predicted' | 'actual';
    artistId: string;
    createdBy?: string;
  }
) {
  // Get the next order index for the show
  const maxOrderIndex = await db
    .select({ max: sql<number>`COALESCE(MAX(order_index), -1)` })
    .from(setlists)
    .where(eq(setlists.showId, showId));

  const orderIndex = (maxOrderIndex[0]?.max ?? -1) + 1;

  const [newSetlist] = await db
    .insert(setlists)
    .values({
      showId,
      artistId: setlistData.artistId,
      name: setlistData.name,
      type: setlistData.type,
      orderIndex,
      createdBy: setlistData.createdBy ?? null,
      isLocked: false,
    })
    .returning();

  return newSetlist;
}

export async function addSongToSetlist(
  setlistId: string,
  songData: {
    songId: string;
    position?: number;
    notes?: string;
  }
) {
  // Get the next position if not provided
  let position = songData.position;
  if (position === undefined) {
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(setlistSongs)
      .where(eq(setlistSongs.setlistId, setlistId));

    position = (maxPosition[0]?.max ?? -1) + 1;
  }

  const [newSetlistSong] = await db
    .insert(setlistSongs)
    .values({
      setlistId,
      songId: songData.songId,
      position,
      notes: songData.notes ?? null,
      isPlayed: false,
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
    })
    .returning();

  return newSetlistSong;
}

export async function updateSetlistSongOrder(
  setlistId: string,
  songOrders: Array<{
    setlistSongId: string;
    position: number;
  }>
) {
  // Update all positions in a transaction
  const updates = songOrders.map(({ setlistSongId, position }) =>
    db
      .update(setlistSongs)
      .set({ position, updatedAt: new Date() })
      .where(
        and(
          eq(setlistSongs.id, setlistSongId),
          eq(setlistSongs.setlistId, setlistId)
        )
      )
  );

  await Promise.all(updates);

  return { success: true };
}

export async function markSongAsPlayed(setlistSongId: string, played = true) {
  const [updated] = await db
    .update(setlistSongs)
    .set({
      isPlayed: played,
      playTime: played ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(setlistSongs.id, setlistSongId))
    .returning();

  return updated;
}

export async function lockSetlist(setlistId: string, locked = true) {
  const [updated] = await db
    .update(setlists)
    .set({
      isLocked: locked,
      updatedAt: new Date(),
    })
    .where(eq(setlists.id, setlistId))
    .returning();

  return updated;
}

export async function deleteSetlist(setlistId: string) {
  // Delete all setlist songs first (or rely on CASCADE if set up)
  await db.delete(setlistSongs).where(eq(setlistSongs.setlistId, setlistId));

  // Delete the setlist
  await db.delete(setlists).where(eq(setlists.id, setlistId));

  return { success: true };
}

export async function removeSongFromSetlist(setlistSongId: string) {
  await db.delete(setlistSongs).where(eq(setlistSongs.id, setlistSongId));

  return { success: true };
}

export async function getTopVotedSongs(showId: string, limit = 10) {
  const results = await db
    .select({
      setlistSong: setlistSongs,
      song: songs,
      setlist: setlists,
    })
    .from(setlistSongs)
    .innerJoin(songs, eq(setlistSongs.songId, songs.id))
    .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
    .where(eq(setlists.showId, showId))
    .orderBy(desc(setlistSongs.netVotes))
    .limit(limit);

  return results;
}

export async function updateSetlistSongVotes(setlistSongId: string) {
  // Count votes for this setlist song
  const voteCount = await db
    .select({
      upvotes: sql<number>`COUNT(*) FILTER (WHERE vote_type = 'up')`,
      downvotes: sql<number>`COUNT(*) FILTER (WHERE vote_type = 'down')`,
    })
    .from(votes)
    .where(eq(votes.setlistSongId, setlistSongId));

  const { upvotes, downvotes } = voteCount[0] || { upvotes: 0, downvotes: 0 };
  const netVotes = upvotes - downvotes;

  // Update the setlist song
  const [updated] = await db
    .update(setlistSongs)
    .set({
      upvotes,
      downvotes,
      netVotes,
      updatedAt: new Date(),
    })
    .where(eq(setlistSongs.id, setlistSongId))
    .returning();

  return updated;
}
