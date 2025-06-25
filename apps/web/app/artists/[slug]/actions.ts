'use server';

import { db } from '@repo/database';
import { artists, shows, showArtists, artistStats, venues } from '@repo/database/src/schema';
import { eq, and, or, desc, gte, lt, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { spotify } from '@repo/external-apis';

export async function getArtist(slug: string) {
  
  const artist = await db.query.artists.findFirst({
    where: eq(artists.slug, slug),
  });
  
  return artist;
}

export async function getArtistShows(artistId: string, type: 'upcoming' | 'past') {
  const now = new Date();
  
  const artistShows = await db
    .select({
      show: shows,
      venue: venues,
      orderIndex: showArtists.orderIndex,
      isHeadliner: showArtists.isHeadliner,
    })
    .from(shows)
    .leftJoin(showArtists, eq(shows.id, showArtists.showId))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(
      and(
        or(
          eq(shows.headlinerArtistId, artistId),
          eq(showArtists.artistId, artistId)
        ),
        type === 'upcoming' 
          ? gte(shows.date, now.toISOString().split('T')[0])
          : lt(shows.date, now.toISOString().split('T')[0])
      )
    )
    .orderBy(type === 'upcoming' ? shows.date : desc(shows.date))
    .limit(type === 'upcoming' ? 10 : 20);
  
  return artistShows;
}

export async function getArtistStats(artistId: string) {
  
  const stats = await db.query.artistStats.findFirst({
    where: eq(artistStats.artistId, artistId),
  });
  
  return stats;
}

export async function getSimilarArtists(artistId: string, genres: string | null) {
  
  // For now, just get random verified artists
  // In production, this would use genre matching or collaborative filtering
  const similar = await db.query.artists.findMany({
    where: and(
      eq(artists.verified, true),
      sql`${artists.id} != ${artistId}`
    ),
    limit: 5,
    orderBy: desc(artists.popularity),
  });
  
  return similar;
}


export async function getArtistTopTracks(spotifyId: string) {
  try {
    const tracks = await spotify.getArtistTopTracks(spotifyId);
    return tracks;
  } catch (error) {
    console.error('Failed to fetch top tracks:', error);
    return [];
  }
}