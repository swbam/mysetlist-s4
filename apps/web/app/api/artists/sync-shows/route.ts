import { db } from '@repo/database';
import { artists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { artistId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: 'artistId is required' },
        { status: 400 }
      );
    }

    // Get artist from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId as string))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Check if we have a Ticketmaster ID
    if (!artist.ticketmasterId) {
      return NextResponse.json(
        { error: 'No Ticketmaster ID found for this artist' },
        { status: 400 }
      );
    }

    // Trigger the sync via Supabase edge function
    const supabase = createServiceClient();
    const { data, error } = await supabase.functions.invoke(
      'sync-artist-shows',
      {
        body: {
          ticketmasterId: artist.ticketmasterId,
          artistId: artist.id,
        },
      }
    );

    if (error) {
      return NextResponse.json(
        { error: 'Failed to sync shows', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Show sync initiated',
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to sync shows',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
