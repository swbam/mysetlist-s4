import { db } from '@repo/database';
import { users, venueTips } from '@repo/database/src/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '~/lib/supabase/server';

const tipSchema = z.object({
  content: z.string().min(10, 'Tip must be at least 10 characters').max(500),
  category: z.enum(['parking', 'food', 'access', 'sound', 'view', 'general']),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params;

    // Get tips for the venue
    const tips = await db
      .select({
        id: venueTips.id,
        content: venueTips.content,
        category: venueTips.category,
        createdAt: venueTips.createdAt,
        userId: venueTips.userId,
        upvotes: venueTips.upvotes,
        userName: users.displayName,
        userImage: sql<string | null>`null`, // No image field in users table
      })
      .from(venueTips)
      .leftJoin(users, eq(venueTips.userId, users.id))
      .where(eq(venueTips.venueId, venueId))
      .orderBy(desc(venueTips.upvotes), desc(venueTips.createdAt));

    return NextResponse.json({ tips });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch venue tips' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: venueId } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = tipSchema.parse(body);

    // Create the tip
    const [newTip] = await db
      .insert(venueTips)
      .values({
        venueId,
        userId: user.id,
        content: validatedData.content,
        category: validatedData.category,
        upvotes: 0,
      })
      .returning();

    // Get the created tip with user info
    const [tipWithUser] = await db
      .select({
        id: venueTips.id,
        content: venueTips.content,
        category: venueTips.category,
        createdAt: venueTips.createdAt,
        userId: venueTips.userId,
        upvotes: venueTips.upvotes,
        userName: users.displayName,
        userImage: sql<string | null>`null`, // No image field in users table
      })
      .from(venueTips)
      .leftJoin(users, eq(venueTips.userId, users.id))
      .where(eq(venueTips.id, newTip!.id));

    return NextResponse.json({ tip: tipWithUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create venue tip' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipId, action } = await request.json();

    if (action !== 'upvote') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Increment upvote count
    const [updatedTip] = await db
      .update(venueTips)
      .set({
        upvotes: sql`${venueTips.upvotes} + 1`,
      })
      .where(eq(venueTips.id, tipId))
      .returning();

    return NextResponse.json({ tip: updatedTip });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to update venue tip' },
      { status: 500 }
    );
  }
}
