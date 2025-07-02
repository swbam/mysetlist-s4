import { NextRequest, NextResponse } from 'next/server';
import { db, artists } from '@repo/database';
import { ilike, or, sql } from 'drizzle-orm';
import { TicketmasterClient } from '@repo/external-apis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ artists: [] });
    }

    // Search in database first
    const dbArtists = await db
      .select({
        id: artists.slug,
        name: artists.name,
        imageUrl: artists.imageUrl,
        genres: artists.genres,
      })
      .from(artists)
      .where(
        or(
          ilike(artists.name, `%${query}%`),
          ilike(sql`coalesce(${artists.genres}, '')`, `%${query}%`)
        )
      )
      .limit(10);

    // Format database results
    const dbResults = dbArtists.map(artist => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.imageUrl || undefined,
      genres: artist.genres ? JSON.parse(artist.genres) : [],
      source: 'database' as const,
    }));

    // Search Ticketmaster if we have less than 10 results from database
    let tmResults: any[] = [];
    if (dbResults.length < 10) {
      try {
        const tmClient = new TicketmasterClient({});
        const tmResponse = await tmClient.searchAttractions({
          keyword: query,
          size: 10 - dbResults.length,
          classificationName: 'Music',
        });

        if (tmResponse._embedded?.attractions) {
          tmResults = tmResponse._embedded.attractions
            .filter((attraction: any) => 
              // Filter out attractions that are already in our database
              !dbResults.some(dbArtist => 
                dbArtist.name.toLowerCase() === attraction.name.toLowerCase()
              )
            )
            .map((attraction: any) => ({
              id: attraction.id,
              name: attraction.name,
              imageUrl: attraction.images?.[0]?.url,
              genres: attraction.classifications?.[0]?.genre 
                ? [attraction.classifications[0].genre.name]
                : [],
              source: 'ticketmaster' as const,
              externalId: attraction.id,
            }));
        }
      } catch (error) {
        console.error('Ticketmaster search failed:', error);
        // Continue with just database results if Ticketmaster fails
      }
    }

    // Combine results, database first
    const combinedResults = [...dbResults, ...tmResults];

    return NextResponse.json({ artists: combinedResults });
  } catch (error) {
    console.error('Artist search error:', error);
    return NextResponse.json(
      { error: 'Failed to search artists' },
      { status: 500 }
    );
  }
} 