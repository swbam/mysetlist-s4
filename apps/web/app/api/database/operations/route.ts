import { db } from '@repo/database';
import { artists } from '@repo/database';
import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// GET /api/database/operations - Get database statistics and health
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation') || 'stats';

    switch (operation) {
      case 'stats': {
        // Get comprehensive database statistics
        const [
          artistCount,
          venueCount,
          showCount,
          songCount,
          setlistCount,
          voteCount,
          activeUsersCount,
        ] = await Promise.all([
          db.execute(sql`SELECT COUNT(*) as count FROM artists`),
          db.execute(sql`SELECT COUNT(*) as count FROM venues`),
          db.execute(sql`SELECT COUNT(*) as count FROM shows`),
          db.execute(sql`SELECT COUNT(*) as count FROM songs`),
          db.execute(sql`SELECT COUNT(*) as count FROM setlists`),
          db.execute(sql`SELECT COUNT(*) as count FROM votes`),
          db.execute(sql`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM votes 
            WHERE created_at > NOW() - INTERVAL '30 days'
          `),
        ]);

        // Get data distribution statistics
        const dataDistribution = await db.execute(sql`
          SELECT 
            'artists_with_spotify' as metric,
            COUNT(*) as value
          FROM artists 
          WHERE spotify_id IS NOT NULL
          
          UNION ALL
          
          SELECT 
            'shows_upcoming' as metric,
            COUNT(*) as value
          FROM shows 
          WHERE date >= CURRENT_DATE
          
          UNION ALL
          
          SELECT 
            'shows_with_setlists' as metric,
            COUNT(DISTINCT show_id) as value
          FROM setlists
          
          UNION ALL
          
          SELECT 
            'venues_with_shows' as metric,
            COUNT(DISTINCT venue_id) as value
          FROM shows
          WHERE venue_id IS NOT NULL
          
          UNION ALL
          
          SELECT 
            'songs_with_votes' as metric,
            COUNT(DISTINCT song_id) as value
          FROM setlist_songs
          WHERE upvotes > 0 OR downvotes > 0
        `);

        // Get recent activity metrics
        const recentActivity = await db.execute(sql`
          SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as vote_count,
            COUNT(DISTINCT user_id) as unique_voters
          FROM votes
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date DESC
        `);

        return NextResponse.json({
          totals: {
            artists: artistCount.rows[0]?.count || 0,
            venues: venueCount.rows[0]?.count || 0,
            shows: showCount.rows[0]?.count || 0,
            songs: songCount.rows[0]?.count || 0,
            setlists: setlistCount.rows[0]?.count || 0,
            votes: voteCount.rows[0]?.count || 0,
            activeUsers: activeUsersCount.rows[0]?.count || 0,
          },
          distribution: dataDistribution.rows.reduce(
            (acc, row) => {
              acc[row.metric] = row.value;
              return acc;
            },
            {} as Record<string, number>
          ),
          recentActivity: recentActivity.rows,
          timestamp: new Date().toISOString(),
        });
      }

      case 'health': {
        // Check database connection and performance
        const startTime = Date.now();

        try {
          await db.execute(sql`SELECT 1 as test`);
          const responseTime = Date.now() - startTime;

          // Check for any critical issues
          const issues = [];

          // Check for orphaned records
          const orphanedSetlists = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM setlists s 
            LEFT JOIN shows sh ON s.show_id = sh.id 
            WHERE sh.id IS NULL
          `);

          if (Number(orphanedSetlists.rows[0]?.count) > 0) {
            issues.push(
              `${orphanedSetlists.rows[0]?.count} orphaned setlists found`
            );
          }

          const orphanedVotes = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM votes v 
            LEFT JOIN setlist_songs ss ON v.setlist_song_id = ss.id 
            WHERE ss.id IS NULL
          `);

          if (Number(orphanedVotes.rows[0]?.count) > 0) {
            issues.push(`${orphanedVotes.rows[0]?.count} orphaned votes found`);
          }

          return NextResponse.json({
            status: issues.length === 0 ? 'healthy' : 'warning',
            responseTime,
            issues,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          const responseTime = Date.now() - startTime;
          return NextResponse.json({
            status: 'unhealthy',
            responseTime,
            error:
              error instanceof Error
                ? error.message
                : 'Database connection failed',
            timestamp: new Date().toISOString(),
          });
        }
      }

      case 'table_sizes': {
        // Get table sizes and row counts
        const tableSizes = await db.execute(sql`
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        `);

        return NextResponse.json({
          tableSizes: tableSizes.rows,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              'Invalid operation. Valid operations: stats, health, table_sizes',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error executing database operation:', error);
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    );
  }
}

// POST /api/database/operations - Execute database maintenance operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, params = {} } = body;

    switch (operation) {
      case 'vacuum': {
        // Perform database vacuum (cleanup)
        await db.execute(sql`VACUUM ANALYZE`);

        return NextResponse.json({
          message: 'Database vacuum completed',
          timestamp: new Date().toISOString(),
        });
      }

      case 'update_vote_counts': {
        // Recalculate all vote counts for data integrity
        const startTime = Date.now();

        // Update setlist song vote counts
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

        // Update setlist total votes
        await db.execute(sql`
          UPDATE setlists 
          SET total_votes = (
            SELECT COALESCE(SUM(upvotes + downvotes), 0)
            FROM setlist_songs 
            WHERE setlist_id = setlists.id
          )
        `);

        // Update show vote counts
        await db.execute(sql`
          UPDATE shows 
          SET vote_count = (
            SELECT COALESCE(SUM(total_votes), 0)
            FROM setlists 
            WHERE show_id = shows.id
          )
        `);

        const duration = Date.now() - startTime;

        return NextResponse.json({
          message: 'Vote counts updated successfully',
          duration,
          timestamp: new Date().toISOString(),
        });
      }

      case 'cleanup_orphaned_records': {
        // Clean up orphaned records
        const results = [];

        // Remove orphaned setlist songs
        const orphanedSetlistSongs = await db.execute(sql`
          DELETE FROM setlist_songs 
          WHERE setlist_id NOT IN (SELECT id FROM setlists)
          RETURNING id
        `);
        results.push(
          `Removed ${orphanedSetlistSongs.rowCount} orphaned setlist songs`
        );

        // Remove orphaned votes
        const orphanedVotes = await db.execute(sql`
          DELETE FROM votes 
          WHERE setlist_song_id NOT IN (SELECT id FROM setlist_songs)
          RETURNING id
        `);
        results.push(`Removed ${orphanedVotes.rowCount} orphaned votes`);

        // Remove orphaned setlists
        const orphanedSetlists = await db.execute(sql`
          DELETE FROM setlists 
          WHERE show_id NOT IN (SELECT id FROM shows)
          RETURNING id
        `);
        results.push(`Removed ${orphanedSetlists.rowCount} orphaned setlists`);

        return NextResponse.json({
          message: 'Cleanup completed',
          results,
          timestamp: new Date().toISOString(),
        });
      }

      case 'update_trending_scores': {
        // Update trending scores for all shows and artists
        await db.execute(sql`SELECT update_trending_scores()`);

        return NextResponse.json({
          message: 'Trending scores updated',
          timestamp: new Date().toISOString(),
        });
      }

      case 'reindex': {
        // Rebuild database indexes for performance
        const indexes = [
          'idx_votes_setlist_song_user',
          'idx_votes_created_at',
          'idx_setlist_songs_votes',
          'idx_shows_trending',
          'idx_artists_trending',
        ];

        for (const index of indexes) {
          try {
            await db.execute(sql.raw(`REINDEX INDEX CONCURRENTLY ${index}`));
          } catch (error) {
            console.warn(`Failed to reindex ${index}:`, error);
          }
        }

        return NextResponse.json({
          message: 'Database indexes rebuilt',
          indexes,
          timestamp: new Date().toISOString(),
        });
      }

      case 'seed_sample_data': {
        // Seed sample data for development/testing
        if (process.env['NODE_ENV'] === 'production') {
          return NextResponse.json(
            { error: 'Sample data seeding not allowed in production' },
            { status: 403 }
          );
        }

        const count = params.count || 10;

        // Insert sample artists
        const sampleArtists = Array.from({ length: count }, (_, i) => ({
          name: `Sample Artist ${i + 1}`,
          slug: `sample-artist-${i + 1}`,
          genres: JSON.stringify(['rock', 'indie']),
          popularity: Math.floor(Math.random() * 100),
          verified: Math.random() > 0.5,
        }));

        const insertedArtists = await db
          .insert(artists)
          .values(sampleArtists)
          .returning({ id: artists.id, name: artists.name });

        return NextResponse.json({
          message: `Seeded ${insertedArtists.length} sample artists`,
          artists: insertedArtists,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              'Invalid operation. Valid operations: vacuum, update_vote_counts, cleanup_orphaned_records, update_trending_scores, reindex, seed_sample_data',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error executing database operation:', error);
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    );
  }
}
