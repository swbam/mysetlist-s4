import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@repo/database';
import { users } from '@repo/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  favoriteGenres: z.array(z.string()).max(10, 'Select up to 10 genres'),
  isPublic: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const [profile] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
      favoriteGenres: profile.favoriteGenres || [],
      isPublic: profile.isPublic ?? true,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = profileUpdateSchema.parse(body);

    // Update user metadata in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        displayName: validatedData.displayName,
        bio: validatedData.bio,
        location: validatedData.location,
        website: validatedData.website,
        favoriteGenres: validatedData.favoriteGenres,
        isPublic: validatedData.isPublic,
      }
    });

    if (updateError) {
      throw updateError;
    }

    // Update user record in database
    await db
      .update(users)
      .set({
        displayName: validatedData.displayName,
        bio: validatedData.bio || null,
        location: validatedData.location || null,
        website: validatedData.website || null,
        favoriteGenres: validatedData.favoriteGenres,
        isPublic: validatedData.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}