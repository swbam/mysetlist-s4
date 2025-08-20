/**
 * Trending Calculator
 * Calculates trending scores for artists, shows, and songs
 */

import { db, artists, shows, songs, votes, artistSongs } from '@repo/database';
import { eq, and, gte, sql, desc, asc } from 'drizzle-orm';

export interface TrendingCalculationOptions {
  artistIds?: string[];
  forceRecalculate?: boolean;
  timeWindow?: {
    hours: number;
    days: number;
  };
}

export interface TrendingCalculationResult {
  artistsUpdated: number;
  showsUpdated: number;
  songsUpdated: number;
  duration: number;
  timestamp: Date;
}

/**
 * Calculate trending scores based on voting activity, view counts, and recency
 */
export async function calculateTrendingScores(
  options: TrendingCalculationOptions = {}
): Promise<TrendingCalculationResult> {
  const startTime = Date.now();
  const timestamp = new Date();
  
  const {
    artistIds,
    forceRecalculate = false,
    timeWindow = { hours: 24, days: 7 }
  } = options;

  let artistsUpdated = 0;
  let showsUpdated = 0;
  let songsUpdated = 0;

  try {
    console.log('Starting trending scores calculation...');

    // Calculate time boundaries
    const recentCutoff = new Date(Date.now() - (timeWindow.hours * 60 * 60 * 1000));
    const weekCutoff = new Date(Date.now() - (timeWindow.days * 24 * 60 * 60 * 1000));

    // 1. Calculate Artist Trending Scores
    console.log('Calculating artist trending scores...');
    
    const artistQuery = db
      .select({
        artistId: artists.id,
        name: artists.name,
        totalVotes: sql<number>`COALESCE(COUNT(DISTINCT ${votes.id}), 0)`,
        recentVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.createdAt} >= ${recentCutoff} THEN 1 ELSE 0 END), 0)`,
        weekVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.createdAt} >= ${weekCutoff} THEN 1 ELSE 0 END), 0)`,
        totalShows: sql<number>`COALESCE(COUNT(DISTINCT ${shows.id}), 0)`,
        upcomingShows: sql<number>`COALESCE(SUM(CASE WHEN ${shows.date} >= CURRENT_DATE THEN 1 ELSE 0 END), 0)`,
        followCount: sql<number>`COALESCE(${artists.followCount}, 0)`,
      })
      .from(artists)
      .leftJoin(shows, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(votes, eq(votes.showId, shows.id))
      .groupBy(artists.id, artists.name, artists.followCount);

    // Filter by specific artists if provided
    const artistsData = artistIds && artistIds.length > 0
      ? await artistQuery.where(sql`${artists.id} = ANY(${artistIds})`)
      : await artistQuery;

    // Update artist trending scores
    for (const artist of artistsData) {
      try {
        // Calculate trending score using weighted factors
        const trendingScore = calculateArtistTrendingScore({
          recentVotes: artist.recentVotes,
          weekVotes: artist.weekVotes,
          totalVotes: artist.totalVotes,
          upcomingShows: artist.upcomingShows,
          followCount: artist.followCount,
        });

        await db
          .update(artists)
          .set({
            trendingScore,
            trendingUpdatedAt: timestamp,
            updatedAt: timestamp,
          })
          .where(eq(artists.id, artist.artistId));

        artistsUpdated++;
      } catch (error) {
        console.error(`Failed to update trending score for artist ${artist.artistId}:`, error);
      }
    }

    // 2. Calculate Show Trending Scores
    console.log('Calculating show trending scores...');
    
    const showsData = await db
      .select({
        showId: shows.id,
        date: shows.date,
        voteCount: sql<number>`COALESCE(COUNT(${votes.id}), 0)`,
        recentVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.createdAt} >= ${recentCutoff} THEN 1 ELSE 0 END), 0)`,
        daysUntilShow: sql<number>`EXTRACT(DAY FROM ${shows.date} - CURRENT_DATE)`,
      })
      .from(shows)
      .leftJoin(votes, eq(votes.showId, shows.id))
      .where(
        and(
          gte(shows.date, new Date().toISOString().split('T')[0]), // Upcoming shows only
          artistIds && artistIds.length > 0 
            ? sql`${shows.headlinerArtistId} = ANY(${artistIds})`
            : sql`1=1`
        )
      )
      .groupBy(shows.id, shows.date);

    // Update show trending scores
    for (const show of showsData) {
      try {
        const trendingScore = calculateShowTrendingScore({
          voteCount: show.voteCount,
          recentVotes: show.recentVotes,
          daysUntilShow: show.daysUntilShow,
        });

        await db
          .update(shows)
          .set({
            trendingScore,
            updatedAt: timestamp,
          })
          .where(eq(shows.id, show.showId));

        showsUpdated++;
      } catch (error) {
        console.error(`Failed to update trending score for show ${show.showId}:`, error);
      }
    }

    // 3. Calculate Song Trending Scores  
    console.log('Calculating song trending scores...');
    
    const songsData = await db
      .select({
        songId: songs.id,
        popularity: songs.popularity,
        voteCount: sql<number>`COALESCE(COUNT(${votes.id}), 0)`,
        recentVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.createdAt} >= ${recentCutoff} THEN 1 ELSE 0 END), 0)`,
        weekVotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.createdAt} >= ${weekCutoff} THEN 1 ELSE 0 END), 0)`,
      })
      .from(songs)
      .leftJoin(artistSongs, eq(artistSongs.songId, songs.id))
      .leftJoin(votes, eq(votes.songId, songs.id))
      .where(
        artistIds && artistIds.length > 0
          ? sql`${artistSongs.artistId} = ANY(${artistIds})`
          : sql`1=1`
      )
      .groupBy(songs.id, songs.popularity);

    // Update song trending scores
    for (const song of songsData) {
      try {
        const trendingScore = calculateSongTrendingScore({
          popularity: song.popularity || 0,
          voteCount: song.voteCount,
          recentVotes: song.recentVotes,
          weekVotes: song.weekVotes,
        });

        await db
          .update(songs)
          .set({
            trendingScore,
            updatedAt: timestamp,
          })
          .where(eq(songs.id, song.songId));

        songsUpdated++;
      } catch (error) {
        console.error(`Failed to update trending score for song ${song.songId}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`Trending calculation completed in ${duration}ms: ${artistsUpdated} artists, ${showsUpdated} shows, ${songsUpdated} songs updated`);

    return {
      artistsUpdated,
      showsUpdated,
      songsUpdated,
      duration,
      timestamp,
    };

  } catch (error) {
    console.error('Trending calculation failed:', error);
    throw error;
  }
}

/**
 * Calculate trending score for an artist
 */
function calculateArtistTrendingScore(data: {
  recentVotes: number;
  weekVotes: number;
  totalVotes: number;
  upcomingShows: number;
  followCount: number;
}): number {
  const {
    recentVotes,
    weekVotes,
    totalVotes,
    upcomingShows,
    followCount,
  } = data;

  // Weighted scoring system
  const recentVotesScore = recentVotes * 10; // High weight for recent activity
  const weekVotesScore = weekVotes * 3; // Medium weight for weekly activity
  const totalVotesScore = Math.log(totalVotes + 1) * 2; // Logarithmic scale for total votes
  const upcomingShowsScore = upcomingShows * 5; // Shows drive trending
  const followCountScore = Math.log(followCount + 1) * 1.5; // Logarithmic scale for followers

  const trendingScore = 
    recentVotesScore +
    weekVotesScore +
    totalVotesScore +
    upcomingShowsScore +
    followCountScore;

  return Math.round(trendingScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate trending score for a show
 */
function calculateShowTrendingScore(data: {
  voteCount: number;
  recentVotes: number;
  daysUntilShow: number;
}): number {
  const { voteCount, recentVotes, daysUntilShow } = data;

  // Base score from votes
  const voteScore = voteCount * 2;
  const recentVoteScore = recentVotes * 5;
  
  // Proximity bonus - shows happening soon get higher scores
  let proximityMultiplier = 1;
  if (daysUntilShow <= 1) {
    proximityMultiplier = 3; // Today/tomorrow
  } else if (daysUntilShow <= 7) {
    proximityMultiplier = 2; // This week
  } else if (daysUntilShow <= 30) {
    proximityMultiplier = 1.5; // This month
  }

  const trendingScore = (voteScore + recentVoteScore) * proximityMultiplier;
  
  return Math.round(trendingScore * 100) / 100;
}

/**
 * Calculate trending score for a song
 */
function calculateSongTrendingScore(data: {
  popularity: number;
  voteCount: number;
  recentVotes: number;
  weekVotes: number;
}): number {
  const { popularity, voteCount, recentVotes, weekVotes } = data;

  // Base score from Spotify popularity (0-100)
  const popularityScore = popularity * 0.1;
  
  // Vote-based scores
  const voteScore = voteCount * 1;
  const recentVoteScore = recentVotes * 5; // High weight for recent activity
  const weekVoteScore = weekVotes * 2;

  const trendingScore = 
    popularityScore +
    voteScore +
    recentVoteScore +
    weekVoteScore;

  return Math.round(trendingScore * 100) / 100;
}

/**
 * Get trending artists with calculated scores
 */
export async function getTrendingArtists(limit: number = 50) {
  return await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      trendingScore: artists.trendingScore,
      followCount: artists.followCount,
      trendingUpdatedAt: artists.trendingUpdatedAt,
    })
    .from(artists)
    .where(sql`${artists.trendingScore} > 0`)
    .orderBy(desc(artists.trendingScore))
    .limit(limit);
}

/**
 * Get trending shows with calculated scores
 */
export async function getTrendingShows(limit: number = 50) {
  return await db
    .select({
      id: shows.id,
      name: shows.name,
      slug: shows.slug,
      date: shows.date,
      trendingScore: shows.trendingScore,
      artist: {
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        imageUrl: artists.imageUrl,
      },
    })
    .from(shows)
    .innerJoin(artists, eq(artists.id, shows.headlinerArtistId))
    .where(
      and(
        sql`${shows.trendingScore} > 0`,
        gte(shows.date, new Date().toISOString().split('T')[0])
      )
    )
    .orderBy(desc(shows.trendingScore))
    .limit(limit);
}

/**
 * Get trending songs with calculated scores
 */
export async function getTrendingSongs(limit: number = 50) {
  return await db
    .select({
      id: songs.id,
      name: songs.name,
      artist: songs.artist,
      albumName: songs.albumName,
      trendingScore: songs.trendingScore,
      popularity: songs.popularity,
    })
    .from(songs)
    .where(sql`${songs.trendingScore} > 0`)
    .orderBy(desc(songs.trendingScore))
    .limit(limit);
}