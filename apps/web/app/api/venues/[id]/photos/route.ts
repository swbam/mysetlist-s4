import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@repo/database';
import { venuePhotos, users } from '@repo/database/src/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

const photoSchema = z.object({
  url: z.string().url('Invalid image URL'),
  caption: z.string().max(200).optional(),
  category: z.enum(['interior', 'exterior', 'stage', 'seating', 'parking', 'other']),
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
      conditions.push(eq(venuePhotos.category, category as any));
    }

    // Get photos for the venue
    const photos = await db
      .select({
        id: venuePhotos.id,
        url: venuePhotos.url,
        caption: venuePhotos.caption,
        category: venuePhotos.category,
        createdAt: venuePhotos.createdAt,
        userId: venuePhotos.userId,
        userName: users.name,
        userImage: users.image,
      })
      .from(venuePhotos)
      .leftJoin(users, eq(venuePhotos.userId, users.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(venuePhotos.createdAt));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching venue photos:', error);
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
        url: validatedData.url,
        caption: validatedData.caption,
        category: validatedData.category,
      })
      .returning();

    // Get the created photo with user info
    const [photoWithUser] = await db
      .select({
        id: newPhoto.id,
        url: newPhoto.url,
        caption: newPhoto.caption,
        category: newPhoto.category,
        createdAt: newPhoto.createdAt,
        userId: newPhoto.userId,
        userName: users.name,
        userImage: users.image,
      })
      .from(venuePhotos)
      .leftJoin(users, eq(venuePhotos.userId, users.id))
      .where(eq(venuePhotos.id, newPhoto.id));

    return NextResponse.json({ photo: photoWithUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating venue photo:', error);
    return NextResponse.json(
      { error: 'Failed to create venue photo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { photoId } = await request.json();

    // Check if the user owns the photo
    const [photo] = await db
      .select()
      .from(venuePhotos)
      .where(eq(venuePhotos.id, photoId));

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    if (photo.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete the photo
    await db
      .delete(venuePhotos)
      .where(eq(venuePhotos.id, photoId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting venue photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue photo' },
      { status: 500 }
    );
  }
}