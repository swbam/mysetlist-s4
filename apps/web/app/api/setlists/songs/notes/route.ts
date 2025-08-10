import { getUser } from "@repo/auth/server";
import { db } from "@repo/database";
import { setlistSongs, setlists } from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { setlistSongId, notes } = await request.json();

    if (!setlistSongId) {
      return NextResponse.json(
        { error: "Missing required field: setlistSongId" },
        { status: 400 },
      );
    }

    // Get setlist song and check permissions
    const setlistSong = await db
      .select({
        id: setlistSongs.id,
        setlistId: setlistSongs.setlistId,
      })
      .from(setlistSongs)
      .where(eq(setlistSongs.id, setlistSongId))
      .limit(1);

    if (setlistSong.length === 0) {
      return NextResponse.json(
        { error: "Setlist song not found" },
        { status: 404 },
      );
    }

    const setlistSongData = setlistSong[0]!; // Safe because we checked length above

    // Check if user can edit the setlist
    const setlist = await db
      .select({
        createdBy: setlists.createdBy,
        isLocked: setlists.isLocked,
      })
      .from(setlists)
      .where(eq(setlists.id, setlistSongData.setlistId))
      .limit(1);

    if (setlist.length === 0) {
      return NextResponse.json(
        { error: "Setlist not found" },
        { status: 404 },
      );
    }

    const setlistData = setlist[0]!; // Safe because we checked length above
    if (setlistData.createdBy !== user.id && setlistData.isLocked) {
      return NextResponse.json(
        { error: "Cannot modify this setlist" },
        { status: 403 },
      );
    }

    // Update notes
    await db
      .update(setlistSongs)
      .set({ notes })
      .where(eq(setlistSongs.id, setlistSongId));

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to update song notes" },
      { status: 500 },
    );
  }
}
