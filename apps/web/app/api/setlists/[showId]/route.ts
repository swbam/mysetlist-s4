import { db } from "@repo/database";
import { setlistSongs, setlists, songs } from "@repo/database";
import { and, asc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    showId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { showId } = await params;
    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 },
      );
    }

    // Fetch setlists for this show
    const setlistsRows = await db
      .select({
        id: setlists.id,
        name: setlists.name,
        type: setlists.type,
      })
      .from(setlists)
      .where(eq(setlists.showId, showId));

    if (setlistsRows.length === 0) {
      return NextResponse.json({ setlists: [] });
    }

    const setlistIds = setlistsRows.map((s) => s.id);

    // Fetch songs for these setlists
    const songRows = await db
      .select({
        setlistId: setlistSongs.setlistId,
        id: setlistSongs.id,
        songId: setlistSongs.songId,
        position: setlistSongs.position,
        notes: setlistSongs.notes,
        isPlayed: setlistSongs.isPlayed,
        playTime: setlistSongs.playTime,
        upvotes: setlistSongs.upvotes,
        s_id: songs.id,
        s_name: songs.name,
        s_artist: songs.artist,
        s_durationMs: songs.durationMs,
        s_albumArtUrl: songs.albumArtUrl,
      })
      .from(setlistSongs)
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .where(inArray(setlistSongs.setlistId, setlistIds))
      .orderBy(asc(setlistSongs.position));

    const songsBySetlist = new Map<string, any[]>();
    for (const row of songRows) {
      const list = songsBySetlist.get(row.setlistId) || [];
      list.push({
        id: row.id,
        songId: row.songId,
        position: row.position,
        notes: row.notes ?? undefined,
        isPlayed: row.isPlayed ?? undefined,
        playTime: row.playTime ?? undefined,
        upvotes: row.upvotes ?? 0,
        song: {
          id: row.s_id,
          title: row.s_name,
          artist: row.s_artist,
          durationMs: row.s_durationMs ?? undefined,
          albumArtUrl: row.s_albumArtUrl ?? undefined,
        },
      });
      songsBySetlist.set(row.setlistId, list);
    }

    const payload = setlistsRows.map((s) => ({
      id: s.id,
      name: s.name ?? "Setlist",
      type: s.type as "predicted" | "actual",
      songs: (songsBySetlist.get(s.id) || []).sort(
        (a, b) => a.position - b.position,
      ),
    }));

    return NextResponse.json({ setlists: payload });
  } catch (error) {
    console.error("Error fetching setlists by showId:", error);
    return NextResponse.json(
      { error: "Failed to fetch setlists" },
      { status: 500 },
    );
  }
}
