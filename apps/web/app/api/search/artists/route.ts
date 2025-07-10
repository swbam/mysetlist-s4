import { db } from '@repo/database';
import { artists } from '@repo/database';
import { ilike, or } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ artists: [] });
    }

    // Search artists by name with fuzzy matching
    const searchResults = await db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        imageUrl: artists.imageUrl,
        smallImageUrl: artists.smallImageUrl,
        genres: artists.genres,
        popularity: artists.popularity,
        followers: artists.followers,
        verified: artists.verified,
        spotifyId: artists.spotifyId,
      })
      .from(artists)
      .where(
        or(
          ilike(artists.name, `%${query}%`),
          ilike(artists.name, `${query}%`) // Starts with
        )
      )
      .orderBy(artists.popularity)
      .limit(limit);

    return NextResponse.json({
      artists: searchResults,
      query,
      total: searchResults.length,
    });
  } catch (_error) {
    return NextResponse.json(
      {
        error: 'Artist search failed',
        artists: [],
        query: '',
        total: 0,
      },
      { status: 500 }
    );
  }
}
