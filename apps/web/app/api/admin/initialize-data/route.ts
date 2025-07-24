import { NextRequest, NextResponse } from 'next/server';
import { db, artists, shows, venues, songs } from '@repo/database';
import { desc } from 'drizzle-orm';

// Mock data for quick population
const MOCK_ARTISTS = [
  { name: 'Taylor Swift', genres: ['Pop', 'Country'], popularity: 95 },
  { name: 'Drake', genres: ['Hip Hop', 'R&B'], popularity: 92 },
  { name: 'Bad Bunny', genres: ['Reggaeton', 'Latin'], popularity: 91 },
  { name: 'The Weeknd', genres: ['Pop', 'R&B'], popularity: 90 },
  { name: 'Post Malone', genres: ['Pop', 'Hip Hop'], popularity: 88 },
  { name: 'Billie Eilish', genres: ['Pop', 'Alternative'], popularity: 87 },
  { name: 'Ed Sheeran', genres: ['Pop', 'Folk'], popularity: 86 },
  { name: 'Ariana Grande', genres: ['Pop', 'R&B'], popularity: 85 },
  { name: 'Bruno Mars', genres: ['Pop', 'R&B', 'Funk'], popularity: 84 },
  { name: 'Dua Lipa', genres: ['Pop', 'Dance'], popularity: 83 },
];

const MOCK_VENUES = [
  { name: 'Madison Square Garden', city: 'New York', state: 'NY', capacity: 20000 },
  { name: 'Staples Center', city: 'Los Angeles', state: 'CA', capacity: 19000 },
  { name: 'United Center', city: 'Chicago', state: 'IL', capacity: 23500 },
  { name: 'TD Garden', city: 'Boston', state: 'MA', capacity: 19580 },
  { name: 'American Airlines Arena', city: 'Miami', state: 'FL', capacity: 19600 },
];

async function seedMockData() {
  const results = {
    artists: 0,
    venues: 0,
    shows: 0,
    songs: 0,
  };

  // Check if data already exists
  const existingArtists = await db.select().from(artists).limit(1);
  if (existingArtists.length > 0) {
    return { ...results, message: 'Data already exists' };
  }

  // Insert mock artists
  const insertedArtists = await db.insert(artists).values(
    MOCK_ARTISTS.map((artist, index) => ({
      name: artist.name,
      slug: artist.name.toLowerCase().replace(/\s+/g, '-'),
      genres: JSON.stringify(artist.genres),
      popularity: artist.popularity,
      followers: Math.floor(Math.random() * 10000000) + 100000,
      followerCount: Math.floor(Math.random() * 50000) + 1000,
      imageUrl: `https://picsum.photos/seed/${artist.name}/400/400`,
      smallImageUrl: `https://picsum.photos/seed/${artist.name}/150/150`,
      verified: true,
      trendingScore: artist.popularity + Math.random() * 20,
    }))
  ).returning();
  results.artists = insertedArtists.length;

  // Insert mock venues
  const insertedVenues = await db.insert(venues).values(
    MOCK_VENUES.map((venue) => ({
      name: venue.name,
      slug: venue.name.toLowerCase().replace(/\s+/g, '-'),
      city: venue.city,
      state: venue.state,
      country: 'USA',
      timezone: 'America/New_York', // Default timezone
      capacity: venue.capacity,
      imageUrl: `https://picsum.photos/seed/${venue.name}/600/400`,
    }))
  ).returning();
  results.venues = insertedVenues.length;

  // Create mock shows
  const showsToInsert = [];
  for (const artist of insertedArtists.slice(0, 5)) {
    for (const venue of insertedVenues) {
      const showDate = new Date();
      showDate.setDate(showDate.getDate() + Math.floor(Math.random() * 180));
      
      showsToInsert.push({
        name: `${artist.name} at ${venue.name}`,
        slug: `${artist.slug}-${venue.slug}-${showDate.toISOString().split('T')[0]}`,
        headlinerArtistId: artist.id,
        venueId: venue.id,
        date: showDate.toISOString().split('T')[0], // date column expects string date
        startTime: '20:00',
        status: showDate > new Date() ? 'upcoming' : 'completed',
        trendingScore: Math.random() * 100,
      });
    }
  }
  
  const insertedShows = await db.insert(shows).values(showsToInsert).returning();
  results.shows = insertedShows.length;

  // Create mock songs for each artist
  const songsToInsert = [];
  for (const artist of insertedArtists) {
    const songCount = Math.floor(Math.random() * 10) + 15;
    for (let i = 0; i < songCount; i++) {
      songsToInsert.push({
        title: `Song ${i + 1}`,
        artist: artist.name,
        durationMs: (Math.floor(Math.random() * 240) + 120) * 1000, // 2-6 minutes in ms
        popularity: Math.floor(Math.random() * 100),
        previewUrl: `https://example.com/preview/${artist.id}/${i}`,
      });
    }
  }
  
  const insertedSongs = await db.insert(songs).values(songsToInsert).returning();
  results.songs = insertedSongs.length;

  return results;
}

async function initializeTrendingScores() {
  // Initialize trending for all entities
  const baseUrl = process.env['NEXT_PUBLIC_URL'] || 'http://localhost:3001';
  const adminKey = process.env['ADMIN_API_KEY'];
  
  const headers: HeadersInit = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};

  // Seed trending metrics
  const seedResponse = await fetch(`${baseUrl}/api/admin/seed-trending?type=all`, {
    method: 'POST',
    headers,
  });

  if (!seedResponse.ok) {
    throw new Error('Failed to seed trending data');
  }

  // Calculate trending scores
  const calculateResponse = await fetch(`${baseUrl}/api/admin/calculate-trending?type=all`, {
    method: 'POST',
    headers,
  });

  if (!calculateResponse.ok) {
    throw new Error('Failed to calculate trending scores');
  }

  const seedResult = await seedResponse.json();
  const calculateResult = await calculateResponse.json();

  return {
    seeding: seedResult.results,
    calculation: calculateResult.results,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization if ADMIN_API_KEY is set
    const adminToken = process.env['ADMIN_API_KEY'];
    if (adminToken) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Step 1: Seed mock data if database is empty
    const mockDataResults = await seedMockData();

    // Step 2: Initialize trending scores
    const trendingResults = await initializeTrendingScores();

    // Step 3: Get summary of initialized data
    const [artistCount, showCount, venueCount, songCount] = await Promise.all([
      db.select().from(artists).then(r => r.length),
      db.select().from(shows).then(r => r.length),
      db.select().from(venues).then(r => r.length),
      db.select().from(songs).then(r => r.length),
    ]);

    // Get top trending items
    const topArtists = await db
      .select({
        name: artists.name,
        trendingScore: artists.trendingScore,
        popularity: artists.popularity,
      })
      .from(artists)
      .orderBy(desc(artists.trendingScore))
      .limit(5);

    const topShows = await db
      .select({
        name: shows.name,
        trendingScore: shows.trendingScore,
        date: shows.date,
      })
      .from(shows)
      .orderBy(desc(shows.trendingScore))
      .limit(5);

    return NextResponse.json({
      success: true,
      message: 'Data initialization complete',
      results: {
        mockData: mockDataResults,
        trending: trendingResults,
      },
      summary: {
        totalCounts: {
          artists: artistCount,
          shows: showCount,
          venues: venueCount,
          songs: songCount,
        },
        topTrending: {
          artists: topArtists,
          shows: topShows,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Data initialization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Data Initialization Endpoint',
    usage: {
      method: 'POST',
      headers: process.env['ADMIN_API_KEY'] ? {
        Authorization: 'Bearer <ADMIN_API_KEY>',
      } : {},
      description: 'Initializes the database with mock data and trending scores',
    },
    steps: [
      '1. Seeds mock artists, venues, shows, and songs if database is empty',
      '2. Initializes realistic trending metrics',
      '3. Calculates trending scores for all entities',
      '4. Returns summary of initialized data',
    ],
    endpoints: {
      manual: [
        'POST /api/admin/seed-trending - Seed trending metrics',
        'POST /api/admin/calculate-trending - Calculate trending scores',
        'POST /api/admin/init-trending - Simple trending initialization',
        'POST /api/artists/sync - Sync real artist from Spotify',
        'GET /api/artists/sync - Sync trending artists from Ticketmaster',
      ],
    },
  });
}