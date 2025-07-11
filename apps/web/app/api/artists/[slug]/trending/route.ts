import { artists, db } from '@repo/database';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const trendingSchema = z.object({
  artistId: z.string(), // Accept ID in body instead of params
  trendingScore: z.number(),
  monthlyListeners: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  _context: { params: Promise<{ slug: string }> }
) {
  try {
    // Check for service role key
    const serviceRole = request.headers.get('x-supabase-service-role');
    if (!serviceRole || serviceRole !== process.env['SUPABASE_SERVICE_ROLE_KEY']) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = trendingSchema.parse(body);
    const artistId = validatedData.artistId;

    // Update artist trending data
    await db
      .update(artists)
      .set({
        trendingScore: validatedData.trendingScore,
        ...(validatedData.monthlyListeners && {
          monthlyListeners: validatedData.monthlyListeners,
        }),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Trending update error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid trending data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update trending data' },
      { status: 500 }
    );
  }
}