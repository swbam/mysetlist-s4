import { db } from '@repo/database';
import { users, venuePhotos } from '@repo/database/src/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '~/lib/supabase/server';

const photoSchema = z.object({
  url: z.string().url('Invalid image URL'),
  caption: z.string().max(200).optional(),
  category: z.enum([
    'interior',
    'exterior',
    'stage',
    'seating',
    'parking',
    'other',
  ]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Build query conditions
    const conditions = [eq(venuePhotos.venueId, venueId)];
    if (category) {
      conditions.push(eq(venuePhotos.photoType, category));
    }

    // Get photos for the venue
    const photos = await db
      .select({
        id: venuePhotos.id,
        url: venuePhotos.imageUrl,
        caption: venuePhotos.caption,
        category: venuePhotos.photoType,
        createdAt: venuePhotos.createdAt,
        userId: venuePhotos.userId,
        userName: users.displayName,
        userImage: sql<string | null>`null`, // No image field in users table
      })
      .from(venuePhotos)
      .leftJoin(users, eq(venuePhotos.userId, users.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(venuePhotos.createdAt));

    return NextResponse.json({ photos });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch venue photos' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
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
    const validatedData = photoSchema.parse(body);

    // Create the photo entry
    const [newPhoto] = await db
      .insert(venuePhotos)
      .values({
        venueId,
        userId: user.id,
        imageUrl: validatedData.url,
        ...(validatedData.caption && { caption: validatedData.caption }),
        photoType: validatedData.category,
      })
      .returning();

    // Get the created photo with user info
    const [photoWithUser] = await db
      .select({
        id: venuePhotos.id,
        url: venuePhotos.imageUrl,
        caption: venuePhotos.caption,
        category: venuePhotos.photoType,
        createdAt: venuePhotos.createdAt,
        userId: venuePhotos.userId,
        userName: users.displayName,
        userImage: sql<string | null>`null`, // No image field in users table
      })
      .from(venuePhotos)
      .leftJoin(users, eq(venuePhotos.userId, users.id))
      .where(eq(venuePhotos.id, newPhoto!.id));

    return NextResponse.json({ photo: photoWithUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create venue photo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId } = await request.json();

    // Check if the user owns the photo
    const [photo] = await db
      .select()
      .from(venuePhotos)
      .where(eq(venuePhotos.id, photoId));

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the photo
    await db.delete(venuePhotos).where(eq(venuePhotos.id, photoId));

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to delete venue photo' },
      { status: 500 }
    );
  }
}
