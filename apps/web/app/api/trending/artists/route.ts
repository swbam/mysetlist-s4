import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { artists, shows, showArtists } from '@repo/database';
import { sql, desc, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const timeframe = searchParams.get('timeframe') || 'week'; // day, week, month

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get trending artists based on multiple factors
    const trendingArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        imageUrl: artists.imageUrl,
        followers: artists.followers,
        popularity: artists.popularity,
        genres: artists.genres,
        trendingScore: artists.trendingScore,
        
        // Calculate recent activity metrics
        recentShows: sql<number>`
          COUNT(DISTINCT CASE 
            WHEN ${shows.date} >= ${startDate.toISOString()} 
            THEN ${shows.id} 
            ELSE NULL 
          END)
        `,
        
        totalShows: sql<number>`
          COUNT(DISTINCT ${shows.id})
        `,
        
        // Trending score calculation (you can adjust weights as needed)
        calculatedTrendingScore: sql<number>`
          (
            COALESCE(${artists.popularity}, 0) * 0.3 +
            COALESCE(${artists.followers}, 0) / 1000.0 * 0.2 +
            COUNT(DISTINCT CASE 
              WHEN ${shows.date} >= ${startDate.toISOString()} 
              THEN ${shows.id} 
              ELSE NULL 
            END) * 10.0 +
            COALESCE(${artists.trendingScore}, 0) * 0.5
          )
        `,
      })
      .from(artists)
      .leftJoin(showArtists, sql`${showArtists.artistId} = ${artists.id}`)
      .leftJoin(shows, sql`${shows.id} = ${showArtists.showId}`)
      .groupBy(artists.id)
      .orderBy(desc(sql`calculatedTrendingScore`))
      .limit(limit);

    // Process and format the results
    const formattedArtists = trendingArtists.map((artist, index) => {
      const genres = artist.genres ? JSON.parse(artist.genres as string) : [];
      
      // Simulate weekly growth (in a real app, you'd track this over time)
      const weeklyGrowth = Math.max(0, (artist.recentShows * 5) + Math.random() * 15);
      
      return {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        imageUrl: artist.imageUrl,
        followers: artist.followers || 0,
        popularity: artist.popularity || 0,
        trendingScore: artist.calculatedTrendingScore || 0,
        genres: genres.slice(0, 3), // Limit to 3 genres
        recentShows: artist.recentShows || 0,
        weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
        rank: index + 1,
      };
    });

    return NextResponse.json({
      artists: formattedArtists,
      timeframe,
      total: formattedArtists.length,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Trending artists API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending artists' },
      { status: 500 }
    );
  }
} 