import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { userShowAttendance } from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { showId, status } = await request.json();

    if (!showId || !['going', 'interested', 'not_going'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Check if user already has attendance for this show
    const existingAttendance = await db
      .select()
      .from(userShowAttendance)
      .where(
        and(
          eq(userShowAttendance.userId, user.id),
          eq(userShowAttendance.showId, showId)
        )
      )
      .limit(1);

    if (existingAttendance.length > 0) {
      // Update existing attendance
      await db
        .update(userShowAttendance)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userShowAttendance.userId, user.id),
            eq(userShowAttendance.showId, showId)
          )
        );
    } else {
      // Create new attendance
      await db.insert(userShowAttendance).values({
        userId: user.id,
        showId,
        status,
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance' },
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
    const showId = searchParams.get('showId');

    if (!showId) {
      return NextResponse.json(
        { error: 'Show ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(userShowAttendance)
      .where(
        and(
          eq(userShowAttendance.userId, user.id),
          eq(userShowAttendance.showId, showId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to remove attendance' },
      { status: 500 }
    );
  }
}
