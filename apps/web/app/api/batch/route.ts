import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@repo/auth/server';
import { db } from '@repo/database';
import { userFollowsArtists, userShowAttendance } from '@repo/database';
import { eq, and, inArray } from 'drizzle-orm';

interface BatchOperation {
  id: string;
  type: 'follow_artist' | 'unfollow_artist' | 'set_attendance' | 'remove_attendance';
  data: any;
}

interface BatchResult {
  id: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operations } = await request.json();

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: 'Invalid operations array' }, { status: 400 });
    }

    if (operations.length > 100) {
      return NextResponse.json({ error: 'Too many operations (max 100)' }, { status: 400 });
    }

    const results: BatchResult[] = [];

    // Process operations in batches by type for efficiency
    const operationsByType = groupOperationsByType(operations);

    // Process follow/unfollow operations
    if (operationsByType.follow_artist.length > 0) {
      const followResults = await processFollowOperations(
        user.id,
        operationsByType.follow_artist,
        true
      );
      results.push(...followResults);
    }

    if (operationsByType.unfollow_artist.length > 0) {
      const unfollowResults = await processFollowOperations(
        user.id,
        operationsByType.unfollow_artist,
        false
      );
      results.push(...unfollowResults);
    }

    // Process attendance operations
    if (operationsByType.set_attendance.length > 0) {
      const attendanceResults = await processAttendanceOperations(
        user.id,
        operationsByType.set_attendance,
        true
      );
      results.push(...attendanceResults);
    }

    if (operationsByType.remove_attendance.length > 0) {
      const removeResults = await processAttendanceOperations(
        user.id,
        operationsByType.remove_attendance,
        false
      );
      results.push(...removeResults);
    }

    // Sort results back to original order
    const resultMap = new Map(results.map(r => [r.id, r]));
    const orderedResults = operations.map(op => resultMap.get(op.id)!);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      results: orderedResults,
      summary: {
        total: operations.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error('Batch API error:', error);
    return NextResponse.json(
      { error: 'Batch processing failed' },
      { status: 500 }
    );
  }
}

function groupOperationsByType(operations: BatchOperation[]) {
  const grouped: Record<BatchOperation['type'], BatchOperation[]> = {
    follow_artist: [],
    unfollow_artist: [],
    set_attendance: [],
    remove_attendance: [],
  };

  operations.forEach(op => {
    grouped[op.type].push(op);
  });

  return grouped;
}

async function processFollowOperations(
  userId: string,
  operations: BatchOperation[],
  follow: boolean
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  const artistIds = operations.map(op => op.data.artistId);

  if (follow) {
    // Batch insert for follows
    const valuesToInsert = operations.map(op => ({
      userId,
      artistId: op.data.artistId,
    }));

    try {
      await db
        .insert(userFollowsArtists)
        .values(valuesToInsert)
        .onConflictDoNothing();

      // All successful
      operations.forEach(op => {
        results.push({ id: op.id, success: true });
      });
    } catch (error) {
      // If batch fails, try individual operations
      for (const op of operations) {
        try {
          await db
            .insert(userFollowsArtists)
            .values({
              userId,
              artistId: op.data.artistId,
            })
            .onConflictDoNothing();
          
          results.push({ id: op.id, success: true });
        } catch (err) {
          results.push({ 
            id: op.id, 
            success: false, 
            error: 'Failed to follow artist' 
          });
        }
      }
    }
  } else {
    // Batch delete for unfollows
    try {
      await db
        .delete(userFollowsArtists)
        .where(
          and(
            eq(userFollowsArtists.userId, userId),
            inArray(userFollowsArtists.artistId, artistIds)
          )
        );

      // All successful
      operations.forEach(op => {
        results.push({ id: op.id, success: true });
      });
    } catch (error) {
      // If batch fails, try individual operations
      for (const op of operations) {
        try {
          await db
            .delete(userFollowsArtists)
            .where(
              and(
                eq(userFollowsArtists.userId, userId),
                eq(userFollowsArtists.artistId, op.data.artistId)
              )
            );
          
          results.push({ id: op.id, success: true });
        } catch (err) {
          results.push({ 
            id: op.id, 
            success: false, 
            error: 'Failed to unfollow artist' 
          });
        }
      }
    }
  }

  return results;
}

async function processAttendanceOperations(
  userId: string,
  operations: BatchOperation[],
  setAttendance: boolean
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  if (setAttendance) {
    // Process each attendance operation individually due to upsert logic
    for (const op of operations) {
      try {
        const { showId, status } = op.data;

        // Check if attendance exists
        const existing = await db
          .select()
          .from(userShowAttendance)
          .where(
            and(
              eq(userShowAttendance.userId, userId),
              eq(userShowAttendance.showId, showId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update
          await db
            .update(userShowAttendance)
            .set({ status, updatedAt: new Date() })
            .where(
              and(
                eq(userShowAttendance.userId, userId),
                eq(userShowAttendance.showId, showId)
              )
            );
        } else {
          // Insert
          await db
            .insert(userShowAttendance)
            .values({
              userId,
              showId,
              status,
            });
        }

        results.push({ id: op.id, success: true });
      } catch (error) {
        results.push({ 
          id: op.id, 
          success: false, 
          error: 'Failed to set attendance' 
        });
      }
    }
  } else {
    // Batch delete for attendance removal
    const showIds = operations.map(op => op.data.showId);

    try {
      await db
        .delete(userShowAttendance)
        .where(
          and(
            eq(userShowAttendance.userId, userId),
            inArray(userShowAttendance.showId, showIds)
          )
        );

      // All successful
      operations.forEach(op => {
        results.push({ id: op.id, success: true });
      });
    } catch (error) {
      // If batch fails, try individual operations
      for (const op of operations) {
        try {
          await db
            .delete(userShowAttendance)
            .where(
              and(
                eq(userShowAttendance.userId, userId),
                eq(userShowAttendance.showId, op.data.showId)
              )
            );
          
          results.push({ id: op.id, success: true });
        } catch (err) {
          results.push({ 
            id: op.id, 
            success: false, 
            error: 'Failed to remove attendance' 
          });
        }
      }
    }
  }

  return results;
}