import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@repo/database';

interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  source: 'database';
  spotifyId?: string;
  popularity?: number;
  verified?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        artists: [],
        query: query || '',
        total: 0 
      });
    }

    const supabase = createSupabaseAdminClient();

    // Search in database only for now
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, name, slug, image_url, genres, verified, popularity, spotify_id')
      .or(`name.ilike.%${query}%,name.ilike.${query}%`)
      .order('popularity', { ascending: false })
      .limit(Math.min(limit, 10));

    if (error) {
      console.error('Database search error:', error);
      throw error;
    }

    const dbResults: Artist[] = (artists || []).map((artist) => ({
      id: artist.slug || artist.id,
      name: artist.name,
      imageUrl: artist.image_url || undefined,
      genres: Array.isArray(artist.genres) ? artist.genres : 
             typeof artist.genres === 'string' ? [artist.genres] : [],
      source: 'database' as const,
      spotifyId: artist.spotify_id || undefined,
      popularity: artist.popularity || 0,
      verified: artist.verified || false,
    }));

    return NextResponse.json({ 
      artists: dbResults,
      query,
      total: dbResults.length,
      source: 'database-only'
    });
  } catch (error) {
    console.error('Artist search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search artists',
        message: error instanceof Error ? error.message : 'Unknown error',
        artists: [],
        query: '',
        total: 0 
      },
      { status: 500 }
    );
  }
}