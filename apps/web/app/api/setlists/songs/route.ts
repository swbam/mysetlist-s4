import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { setlistSongs, setlists } from '@repo/database';
import { eq, max } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { setlistId, songId, position, notes } = await request.json();

    if (!setlistId || !songId) {
      return NextResponse.json(
        { error: 'Missing required fields: setlistId, songId' },
        { status: 400 }
      );
    }

    // Check if user can edit this setlist
    const setlist = await db
      .select({
        id: setlists.id,
        createdBy: setlists.createdBy,
        isLocked: setlists.isLocked,
      })
      .from(setlists)
      .where(eq(setlists.id, setlistId))
      .limit(1);

    if (setlist.length === 0) {
      return NextResponse.json({ error: 'Setlist not found' }, { status: 404 });
    }

    if (setlist[0].createdBy !== user.id && setlist[0].isLocked) {
      return NextResponse.json(
        { error: 'Cannot modify this setlist' },
        { status: 403 }
      );
    }

    // Determine position if not provided
    let finalPosition = position;
    if (!finalPosition || finalPosition === 999) {
      // Get max position and add 1
      const maxPositionResult = await db
        .select({ maxPos: max(setlistSongs.position) })
        .from(setlistSongs)
        .where(eq(setlistSongs.setlistId, setlistId));

      finalPosition = (maxPositionResult[0]?.maxPos || 0) + 1;
    }

    // Add song to setlist
    const newSetlistSong = await db
      .insert(setlistSongs)
      .values({
        setlistId,
        songId,
        position: finalPosition,
        notes,
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      setlistSong: newSetlistSong[0],
    });
  } catch (error) {
    console.error('Add song to setlist error:', error);
    return NextResponse.json(
      { error: 'Failed to add song to setlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const setlistSongId = searchParams.get('setlistSongId');

    if (!setlistSongId) {
      return NextResponse.json(
        { error: 'Missing setlistSongId parameter' },
        { status: 400 }
      );
    }

    // Get setlist song details to check permissions
    const setlistSong = await db
      .select({
        id: setlistSongs.id,
        setlistId: setlistSongs.setlistId,
        position: setlistSongs.position,
      })
      .from(setlistSongs)
      .where(eq(setlistSongs.id, setlistSongId))
      .limit(1);

    if (setlistSong.length === 0) {
      return NextResponse.json(
        { error: 'Setlist song not found' },
        { status: 404 }
      );
    }

    // Check if user can edit the setlist
    const setlist = await db
      .select({
        createdBy: setlists.createdBy,
        isLocked: setlists.isLocked,
      })
      .from(setlists)
      .where(eq(setlists.id, setlistSong[0].setlistId))
      .limit(1);

    if (
      setlist.length === 0 ||
      (setlist[0].createdBy !== user.id && setlist[0].isLocked)
    ) {
      return NextResponse.json(
        { error: 'Cannot modify this setlist' },
        { status: 403 }
      );
    }

    // Delete the setlist song
    await db.delete(setlistSongs).where(eq(setlistSongs.id, setlistSongId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove song from setlist error:', error);
    return NextResponse.json(
      { error: 'Failed to remove song from setlist' },
      { status: 500 }
    );
  }
}
