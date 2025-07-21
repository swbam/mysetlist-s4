import { NextResponse } from 'next/server';
import { db } from '@repo/database';
import { artists, users, shows, venues, songs } from '@repo/database/schema';
import { count } from 'drizzle-orm';

export async function GET() {
  try {
    // Test database connectivity with the cleaned up schema
    const results = await Promise.all([
      db.select({ count: count() }).from(artists),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(shows),
      db.select({ count: count() }).from(venues),
      db.select({ count: count() }).from(songs),
    ]);

    const [artistCount, userCount, showCount, venueCount, songCount] = results;

    return NextResponse.json({
      success: true,
      message: 'Database connection successful after cleanup',
      data: {
        artists: artistCount[0].count,
        users: userCount[0].count,
        shows: showCount[0].count,
        venues: venueCount[0].count,
        songs: songCount[0].count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
EOF < /dev/null