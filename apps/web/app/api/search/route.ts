import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { artists, shows, venues, songs } from '@repo/database';
import { ilike, or, sql, eq } from 'drizzle-orm';

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'song';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  slug: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') as 'artist' | 'show' | 'venue' | 'song' | 'all' | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: SearchResult[] = [];

    // Search artists
    if (!type || type === 'artist' || type === 'all') {
      const artistResults = await db
        .select({
          id: artists.slug,
          type: sql<string>`'artist'`,
          title: artists.name,
          subtitle: sql<string>`COALESCE(${artists.bio}, '')`,
          imageUrl: artists.imageUrl,
          slug: artists.slug,
          popularity: artists.popularity,
          followers: artists.followers,
        })
        .from(artists)
        .where(
          or(
            ilike(artists.name, `%${query}%`),
            sql`${artists.genres}::text ILIKE ${'%' + query + '%'}`
          )
        )
        .orderBy(sql`${artists.popularity} DESC NULLS LAST`)
        .limit(type === 'artist' ? limit : Math.floor(limit / 4));

      results.push(...artistResults.map(artist => ({
        ...artist,
        type: 'artist' as const,
        subtitle: `${artist.followers || 0} followers`,
      })));
    }

    // Search shows
    if (!type || type === 'show' || type === 'all') {
      const showResults = await db
        .select({
          id: shows.slug,
          type: sql<string>`'show'`,
          title: shows.name,
          subtitle: sql<string>`${artists.name} || CASE WHEN ${venues.name} IS NOT NULL THEN ' • ' || ${venues.name} ELSE '' END`,
          imageUrl: artists.imageUrl,
          slug: shows.slug,
          date: shows.date,
          status: shows.status,
        })
        .from(shows)
        .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
        .leftJoin(venues, eq(shows.venueId, venues.id))
        .where(
          or(
            ilike(shows.name, `%${query}%`),
            ilike(artists.name, `%${query}%`)
          )
        )
        .orderBy(sql`${shows.date} DESC NULLS LAST`)
        .limit(type === 'show' ? limit : Math.floor(limit / 4));

      results.push(...showResults.map(show => ({
        ...show,
        type: 'show' as const,
        subtitle: `${show.subtitle} • ${new Date(show.date).toLocaleDateString()}`,
      })));
    }

    // Search venues
    if (!type || type === 'venue' || type === 'all') {
      const venueResults = await db
        .select({
          id: venues.slug,
          type: sql<string>`'venue'`,
          title: venues.name,
          subtitle: sql<string>`${venues.city} || CASE WHEN ${venues.state} IS NOT NULL THEN ', ' || ${venues.state} ELSE '' END || CASE WHEN ${venues.country} IS NOT NULL THEN ', ' || ${venues.country} ELSE '' END`,
          imageUrl: venues.imageUrl,
          slug: venues.slug,
          capacity: venues.capacity,
        })
        .from(venues)
        .where(
          or(
            ilike(venues.name, `%${query}%`),
            ilike(venues.city, `%${query}%`),
            ilike(venues.address, `%${query}%`)
          )
        )
        .orderBy(sql`${venues.capacity} DESC NULLS LAST`)
        .limit(type === 'venue' ? limit : Math.floor(limit / 4));

      results.push(...venueResults.map(venue => ({
        ...venue,
        type: 'venue' as const,
      })));
    }

    // Search songs
    if (!type || type === 'song' || type === 'all') {
      const songResults = await db
        .select({
          id: songs.id,
          type: sql<string>`'song'`,
          title: songs.title,
          subtitle: sql<string>`${songs.artist} || CASE WHEN ${songs.album} IS NOT NULL THEN ' • ' || ${songs.album} ELSE '' END`,
          imageUrl: songs.albumArtUrl,
          slug: sql<string>`${songs.id}`,
          popularity: songs.popularity,
          duration: songs.durationMs,
        })
        .from(songs)
        .where(
          or(
            ilike(songs.title, `%${query}%`),
            ilike(songs.artist, `%${query}%`),
            ilike(songs.album, `%${query}%`)
          )
        )
        .orderBy(sql`${songs.popularity} DESC NULLS LAST`)
        .limit(type === 'song' ? limit : Math.floor(limit / 4));

      results.push(...songResults.map(song => ({
        ...song,
        type: 'song' as const,
      })));
    }

    // Sort results by relevance (exact matches first, then partial matches)
    const sortedResults = results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bExact = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      
      if (aExact !== bExact) {
        return bExact - aExact; // Exact matches first
      }
      
      // Then by type priority (artists first, then shows, venues, songs)
      const typePriority: Record<string, number> = { artist: 4, show: 3, venue: 2, song: 1 };
      return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
    });

    return NextResponse.json({ 
      results: sortedResults.slice(0, limit),
      total: sortedResults.length,
      query,
    });
  } catch (error) {
    console.error('Search failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Search failed', details: errorMessage },
      { status: 500 }
    );
  }
}