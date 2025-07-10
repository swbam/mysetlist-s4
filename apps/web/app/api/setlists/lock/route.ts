import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { setlists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { setlistId, isLocked } = await request.json();

    if (!setlistId || typeof isLocked !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: setlistId, isLocked' },
        { status: 400 }
      );
    }

    // Check if user can edit this setlist
    const setlist = await db
      .select({
        createdBy: setlists.createdBy,
      })
      .from(setlists)
      .where(eq(setlists.id, setlistId))
      .limit(1);

    if (setlist.length === 0) {
      return NextResponse.json({ error: 'Setlist not found' }, { status: 404 });
    }

    if (setlist[0]!.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Cannot modify this setlist' },
        { status: 403 }
      );
    }

    // Update lock status
    await db
      .update(setlists)
      .set({ isLocked })
      .where(eq(setlists.id, setlistId));

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to update setlist lock status' },
      { status: 500 }
    );
  }
}
