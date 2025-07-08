import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { setlistSongs, setlists, songs, votes } from '@repo/database';
import { and, eq, inArray } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{
    showId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { showId } = await params;
    const user = await getUser();

    // Fetch setlists for the show
    const showSetlists = await db
      .select({
        setlist: setlists,
        setlistSong: setlistSongs,
        song: songs,
      })
      .from(setlists)
      .leftJoin(setlistSongs, eq(setlists.id, setlistSongs.setlistId))
      .leftJoin(songs, eq(setlistSongs.songId, songs.id))
      .where(eq(setlists.showId, showId))
      .orderBy(setlists.orderIndex, setlistSongs.position);

    // Get user votes if authenticated
    const userVotes: Record<string, 'up' | 'down'> = {};
    if (user && showSetlists.length > 0) {
      const setlistSongIds = showSetlists
        .filter((row) => row.setlistSong)
        .map((row) => row.setlistSong!.id);

      if (setlistSongIds.length > 0) {
        const voteRecords = await db
          .select({
            setlistSongId: votes.setlistSongId,
            voteType: votes.voteType,
          })
          .from(votes)
          .where(
            and(
              eq(votes.userId, user.id),
              inArray(votes.setlistSongId, setlistSongIds)
            )
          );

        voteRecords.forEach((vote) => {
          if (setlistSongIds.includes(vote.setlistSongId)) {
            userVotes[vote.setlistSongId] = vote.voteType;
          }
        });
      }
    }

    // Group by setlist
    const setlistMap = new Map();

    showSetlists.forEach((row) => {
      const setlist = row.setlist;
      const setlistSong = row.setlistSong;
      const song = row.song;

      if (!setlistMap.has(setlist.id)) {
        setlistMap.set(setlist.id, {
          id: setlist.id,
          name: setlist.name,
          type: setlist.type,
          isLocked: setlist.isLocked,
          songs: [],
        });
      }

      if (setlistSong && song) {
        const setlistEntry = setlistMap.get(setlist.id);
        setlistEntry.songs.push({
          id: setlistSong.id,
          songId: song.id,
          position: setlistSong.position,
          song: {
            id: song.id,
            title: song.title,
            artist: song.artist,
            durationMs: song.durationMs,
            albumArtUrl: song.albumArtUrl,
          },
          notes: setlistSong.notes,
          isPlayed: setlistSong.isPlayed,
          playTime: setlistSong.playTime,
          upvotes: setlistSong.upvotes,
          downvotes: setlistSong.downvotes,
          netVotes: setlistSong.netVotes,
          userVote: userVotes[setlistSong.id] || null,
        });
      }
    });

    const setlistsArray = Array.from(setlistMap.values());

    return NextResponse.json({
      setlists: setlistsArray,
    });
  } catch (error) {
    console.error('Setlists API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
