import { db } from '@repo/database';
import { artists } from '@repo/database';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test simple database connection
    const artistCount = await db.select().from(artists).limit(1);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection works',
      artistCount: artistCount.length,
      sample: artistCount[0] || null,
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}