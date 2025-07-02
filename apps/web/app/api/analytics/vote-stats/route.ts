import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { sql } from 'drizzle-orm';

// GET /api/analytics/vote-stats - Get comprehensive vote statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('showId');
    const timeframe = searchParams.get('timeframe') || '24h'; // 24h, 7d, 30d
    const includeVelocity = searchParams.get('velocity') === 'true';

    // Parse timeframe
    let timeInterval = '24 hours';
    switch (timeframe) {
      case '7d':
        timeInterval = '7 days';
        break;
      case '30d':
        timeInterval = '30 days';
        break;
      case '1h':
        timeInterval = '1 hour';
        break;
      default:
        timeInterval = '24 hours';
    }

    if (showId) {
      // Get stats for a specific show
      const showStats = await db.execute(sql`
        SELECT * FROM get_vote_stats(${showId}::UUID)
      `);

      if (includeVelocity) {
        // Get detailed vote velocity data
        const velocityData = await db.execute(sql`
          SELECT 
            DATE_TRUNC('hour', v.created_at) as hour,
            COUNT(*) as vote_count,
            COUNT(CASE WHEN v.vote_type = 'up' THEN 1 END) as upvotes,
            COUNT(CASE WHEN v.vote_type = 'down' THEN 1 END) as downvotes
          FROM votes v
          INNER JOIN setlist_songs ss ON v.setlist_song_id = ss.id
          INNER JOIN setlists sl ON ss.setlist_id = sl.id
          WHERE sl.show_id = ${showId}::UUID
            AND v.created_at > NOW() - INTERVAL '${sql.raw(timeInterval)}'
          GROUP BY DATE_TRUNC('hour', v.created_at)
          ORDER BY hour DESC
          LIMIT 48
        `);

        return NextResponse.json({
          showStats: showStats.rows[0] || null,
          velocityData: velocityData.rows,
          timeframe,
        });
      }

      return NextResponse.json({
        showStats: showStats.rows[0] || null,
        timeframe,
      });
    } else {
      // Get trending shows with vote metrics
      const trendingShows = await db.execute(sql`
        SELECT * FROM get_trending_shows(20)
      `);

      // Get overall platform vote statistics
      const overallStats = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT shows.id) as total_shows_with_votes,
          COUNT(DISTINCT votes.user_id) as active_voters,
          COUNT(*) as total_votes,
          COUNT(CASE WHEN votes.vote_type = 'up' THEN 1 END) as total_upvotes,
          COUNT(CASE WHEN votes.vote_type = 'down' THEN 1 END) as total_downvotes,
          AVG(CASE WHEN votes.vote_type = 'up' THEN 1 ELSE -1 END) as vote_ratio
        FROM votes
        INNER JOIN setlist_songs ON votes.setlist_song_id = setlist_songs.id
        INNER JOIN setlists ON setlist_songs.setlist_id = setlists.id
        INNER JOIN shows ON setlists.show_id = shows.id
        WHERE votes.created_at > NOW() - INTERVAL '${sql.raw(timeInterval)}'
      `);

      // Get top voted songs
      const topVotedSongs = await db.execute(sql`
        SELECT 
          s.title,
          s.artist,
          SUM(ss.upvotes) as total_upvotes,
          SUM(ss.downvotes) as total_downvotes,
          SUM(ss.net_votes) as net_votes,
          COUNT(DISTINCT sl.show_id) as show_appearances
        FROM songs s
        INNER JOIN setlist_songs ss ON s.id = ss.song_id
        INNER JOIN setlists sl ON ss.setlist_id = sl.id
        INNER JOIN shows sh ON sl.show_id = sh.id
        WHERE sh.date > CURRENT_DATE - INTERVAL '${sql.raw(timeInterval)}'
        GROUP BY s.id, s.title, s.artist
        HAVING SUM(ss.upvotes + ss.downvotes) > 0
        ORDER BY net_votes DESC, total_upvotes DESC
        LIMIT 20
      `);

      // Get vote activity by hour for the past 24 hours
      const hourlyActivity = await db.execute(sql`
        SELECT 
          EXTRACT(HOUR FROM v.created_at) as hour,
          COUNT(*) as vote_count,
          COUNT(CASE WHEN v.vote_type = 'up' THEN 1 END) as upvotes,
          COUNT(CASE WHEN v.vote_type = 'down' THEN 1 END) as downvotes
        FROM votes v
        WHERE v.created_at > NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM v.created_at)
        ORDER BY hour
      `);

      return NextResponse.json({
        trendingShows: trendingShows.rows,
        overallStats: overallStats.rows[0] || {},
        topVotedSongs: topVotedSongs.rows,
        hourlyActivity: hourlyActivity.rows,
        timeframe,
      });
    }
  } catch (error) {
    console.error('Error getting vote statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get vote statistics' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/vote-stats - Trigger vote statistics update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'update_trending') {
      // Trigger trending score calculation
      await db.execute(sql`SELECT update_trending_scores()`);
      
      return NextResponse.json({
        message: 'Trending scores updated successfully',
        timestamp: new Date().toISOString(),
      });
    } else if (action === 'recalculate_votes') {
      // Recalculate all vote counts (useful for data integrity)
      await db.execute(sql`
        UPDATE setlist_songs 
        SET 
          upvotes = (
            SELECT COUNT(*) 
            FROM votes 
            WHERE setlist_song_id = setlist_songs.id 
              AND vote_type = 'up'
          ),
          downvotes = (
            SELECT COUNT(*) 
            FROM votes 
            WHERE setlist_song_id = setlist_songs.id 
              AND vote_type = 'down'
          )
      `);
      
      await db.execute(sql`
        UPDATE setlist_songs 
        SET net_votes = upvotes - downvotes
      `);
      
      await db.execute(sql`
        UPDATE setlists 
        SET total_votes = (
          SELECT COALESCE(SUM(upvotes + downvotes), 0)
          FROM setlist_songs 
          WHERE setlist_id = setlists.id
        )
      `);
      
      await db.execute(sql`
        UPDATE shows 
        SET vote_count = (
          SELECT COALESCE(SUM(total_votes), 0)
          FROM setlists 
          WHERE show_id = shows.id
        )
      `);

      return NextResponse.json({
        message: 'Vote counts recalculated successfully',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Valid actions: update_trending, recalculate_votes' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating vote statistics:', error);
    return NextResponse.json(
      { error: 'Failed to update vote statistics' },
      { status: 500 }
    );
  }
}