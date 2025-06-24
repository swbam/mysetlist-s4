import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { showComments, users } from '@repo/database';
import { eq, desc } from 'drizzle-orm';
import { getUser } from '@repo/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('showId');
    
    if (!showId) {
      return NextResponse.json({ error: 'Show ID is required' }, { status: 400 });
    }

    // Get comments with user info
    const comments = await db
      .select({
        id: showComments.id,
        content: showComments.content,
        createdAt: showComments.createdAt,
        userId: showComments.userId,
        showId: showComments.showId,
        userName: users.displayName,
        userAvatar: users.avatarUrl,
      })
      .from(showComments)
      .innerJoin(users, eq(showComments.userId, users.id))
      .where(eq(showComments.showId, showId))
      .orderBy(desc(showComments.createdAt));

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { showId, content } = await request.json();

    if (!showId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Create comment
    const [comment] = await db
      .insert(showComments)
      .values({
        showId,
        userId: user.id,
        content: content.trim(),
      })
      .returning();

    // Get user info for the response
    const [userInfo] = await db
      .select({
        name: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, user.id));

    return NextResponse.json({
      comment: {
        ...comment,
        userName: userInfo.name,
        userAvatar: userInfo.avatarUrl,
      }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}