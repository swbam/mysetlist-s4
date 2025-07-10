#!/usr/bin/env tsx

import { faker } from '@faker-js/faker';
import {
  artistStats,
  artists,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  userFollowsArtists,
  users,
  venueTips,
  venues,
  votes,
} from '@repo/database/src/schema';
import { eq, sql } from 'drizzle-orm';
import { db } from './db-client';

// Set seed for consistent random data
faker.seed(123);

// Utility function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Calculate trending score based on recency and popularity
function calculateTrendingScore(date: Date, popularity: number): number {
  const hoursAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  const timeDecay = 0.5 ** (hoursAgo / 48); // Half-life of 48 hours
  return popularity * timeDecay;
}

// Artist data with varying popularity levels
const artistsData = [
  // Top tier - very popular
  {
    name: 'Taylor Swift',
    genres: ['pop', 'country'],
    popularity: 98,
    monthlyListeners: 84000000,
  },
  {
    name: 'Bad Bunny',
    genres: ['reggaeton', 'latin'],
    popularity: 96,
    monthlyListeners: 65000000,
  },
  {
    name: 'The Weeknd',
    genres: ['r&b', 'pop'],
    popularity: 94,
    monthlyListeners: 76000000,
  },
  {
    name: 'Billie Eilish',
    genres: ['pop', 'alternative'],
    popularity: 92,
    monthlyListeners: 62000000,
  },

  // Mid-tier - moderately popular
  {
    name: 'Arctic Monkeys',
    genres: ['indie rock', 'alternative'],
    popularity: 85,
    monthlyListeners: 42000000,
  },
  {
    name: 'Dua Lipa',
    genres: ['pop', 'dance'],
    popularity: 87,
    monthlyListeners: 58000000,
  },
  {
    name: 'Twenty One Pilots',
    genres: ['alternative', 'pop'],
    popularity: 82,
    monthlyListeners: 36000000,
  },
  {
    name: 'Imagine Dragons',
    genres: ['pop rock', 'alternative'],
    popularity: 84,
    monthlyListeners: 45000000,
  },

  // Rising artists
  {
    name: 'Olivia Rodrigo',
    genres: ['pop', 'pop rock'],
    popularity: 88,
    monthlyListeners: 40000000,
  },
  {
    name: 'Doja Cat',
    genres: ['r&b', 'pop'],
    popularity: 86,
    monthlyListeners: 35000000,
  },

  // Rock/Alternative
  {
    name: 'Foo Fighters',
    genres: ['rock', 'alternative rock'],
    popularity: 78,
    monthlyListeners: 25000000,
  },
  {
    name: 'Red Hot Chili Peppers',
    genres: ['rock', 'funk rock'],
    popularity: 79,
    monthlyListeners: 28000000,
  },
  {
    name: 'Pearl Jam',
    genres: ['grunge', 'rock'],
    popularity: 75,
    monthlyListeners: 18000000,
  },
  {
    name: 'The Killers',
    genres: ['rock', 'indie rock'],
    popularity: 77,
    monthlyListeners: 22000000,
  },

  // Electronic/Dance
  {
    name: 'Calvin Harris',
    genres: ['edm', 'dance'],
    popularity: 83,
    monthlyListeners: 32000000,
  },
  {
    name: 'Marshmello',
    genres: ['edm', 'pop'],
    popularity: 81,
    monthlyListeners: 30000000,
  },

  // Hip-Hop
  {
    name: 'Drake',
    genres: ['hip hop', 'r&b'],
    popularity: 95,
    monthlyListeners: 71000000,
  },
  {
    name: 'Post Malone',
    genres: ['hip hop', 'pop'],
    popularity: 90,
    monthlyListeners: 52000000,
  },
  {
    name: 'Travis Scott',
    genres: ['hip hop', 'trap'],
    popularity: 89,
    monthlyListeners: 46000000,
  },

  // Country
  {
    name: 'Morgan Wallen',
    genres: ['country', 'country pop'],
    popularity: 88,
    monthlyListeners: 38000000,
  },
];

// Venue data - real venues in major cities
const venuesData = [
  // New York
  {
    name: 'Madison Square Garden',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    capacity: 20789,
    venueType: 'arena',
    timezone: 'America/New_York',
  },
  {
    name: 'Barclays Center',
    city: 'Brooklyn',
    state: 'NY',
    country: 'USA',
    capacity: 19000,
    venueType: 'arena',
    timezone: 'America/New_York',
  },
  {
    name: 'Radio City Music Hall',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    capacity: 6015,
    venueType: 'theater',
    timezone: 'America/New_York',
  },

  // Los Angeles
  {
    name: 'The Forum',
    city: 'Inglewood',
    state: 'CA',
    country: 'USA',
    capacity: 17505,
    venueType: 'arena',
    timezone: 'America/Los_Angeles',
  },
  {
    name: 'Hollywood Bowl',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    capacity: 17500,
    venueType: 'amphitheater',
    timezone: 'America/Los_Angeles',
  },
  {
    name: 'Greek Theatre',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    capacity: 5900,
    venueType: 'amphitheater',
    timezone: 'America/Los_Angeles',
  },

  // Chicago
  {
    name: 'United Center',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    capacity: 20917,
    venueType: 'arena',
    timezone: 'America/Chicago',
  },
  {
    name: 'Chicago Theatre',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    capacity: 3600,
    venueType: 'theater',
    timezone: 'America/Chicago',
  },

  // Nashville
  {
    name: 'Bridgestone Arena',
    city: 'Nashville',
    state: 'TN',
    country: 'USA',
    capacity: 20000,
    venueType: 'arena',
    timezone: 'America/Chicago',
  },
  {
    name: 'Ryman Auditorium',
    city: 'Nashville',
    state: 'TN',
    country: 'USA',
    capacity: 2362,
    venueType: 'theater',
    timezone: 'America/Chicago',
  },

  // Miami
  {
    name: 'FTX Arena',
    city: 'Miami',
    state: 'FL',
    country: 'USA',
    capacity: 19600,
    venueType: 'arena',
    timezone: 'America/New_York',
  },

  // Seattle
  {
    name: 'Climate Pledge Arena',
    city: 'Seattle',
    state: 'WA',
    country: 'USA',
    capacity: 18100,
    venueType: 'arena',
    timezone: 'America/Los_Angeles',
  },

  // Austin
  {
    name: 'Moody Center',
    city: 'Austin',
    state: 'TX',
    country: 'USA',
    capacity: 15000,
    venueType: 'arena',
    timezone: 'America/Chicago',
  },

  // International
  {
    name: 'O2 Arena',
    city: 'London',
    state: null,
    country: 'UK',
    capacity: 20000,
    venueType: 'arena',
    timezone: 'Europe/London',
  },
  {
    name: 'Accor Arena',
    city: 'Paris',
    state: null,
    country: 'France',
    capacity: 20300,
    venueType: 'arena',
    timezone: 'Europe/Paris',
  },
];

// Song titles for different genres
const songTitlesByGenre = {
  pop: [
    'Midnight Dreams',
    'Golden Hour',
    'Stay With Me',
    'Dancing in the Rain',
    'Electric Love',
    'Summer Nights',
  ],
  rock: [
    'Thunder Road',
    'Breaking Chains',
    'Fire and Stone',
    'Rebel Heart',
    'Edge of Tomorrow',
    'Gravity',
  ],
  'hip hop': [
    'City Lights',
    'On Top',
    'No Limits',
    'Real Talk',
    'Money Moves',
    'Night Drive',
  ],
  country: [
    'Back Roads',
    'Whiskey Sunrise',
    'Small Town Dreams',
    'Dusty Boots',
    'Heart of Gold',
    'Southern Nights',
  ],
  electronic: [
    'Neon Pulse',
    'Digital Dreams',
    'Bass Drop',
    'Synthetic Love',
    'Circuit Break',
    'Frequency',
  ],
  alternative: [
    'Fading Echoes',
    'Broken Glass',
    'Silver Lining',
    'Lost in Static',
    'Parallel Lives',
    'Shadow Dance',
  ],
};

async function clearDatabase() {
  // Delete in correct order to respect foreign keys
  await db.delete(votes);
  await db.delete(setlistSongs);
  await db.delete(setlists);
  await db.delete(venueTips);
  await db.delete(showArtists);
  await db.delete(shows);
  await db.delete(userFollowsArtists);
  await db.delete(artistStats);
  await db.delete(songs);
  await db.delete(artists);
  await db.delete(venues);
  await db.delete(users);
}

async function seedUsers() {
  const usersToCreate = [
    {
      email: 'admin@mysetlist.com',
      displayName: 'Admin User',
      role: 'admin' as const,
    },
    {
      email: 'moderator@mysetlist.com',
      displayName: 'Moderator User',
      role: 'moderator' as const,
    },
  ];

  // Add regular users
  for (let i = 1; i <= 20; i++) {
    usersToCreate.push({
      email: faker.internet.email(),
      displayName: faker.person.fullName(),
      role: 'user' as const,
    });
  }

  const createdUsers = await db.insert(users).values(usersToCreate).returning();

  return createdUsers;
}

async function seedArtists() {
  const artistsToCreate = artistsData.map((artist) => {
    const baseFollowers = artist.monthlyListeners / 3;
    const appFollowers = Math.floor(
      baseFollowers * (0.001 + Math.random() * 0.01)
    ); // 0.1% to 1% of Spotify followers

    return {
      name: artist.name,
      slug: generateSlug(artist.name),
      genres: JSON.stringify(artist.genres),
      popularity: artist.popularity,
      followers: baseFollowers,
      followerCount: appFollowers,
      monthlyListeners: artist.monthlyListeners,
      verified: true,
      bio: faker.lorem.paragraph(),
      imageUrl: faker.image.url({ width: 640, height: 640 }),
      smallImageUrl: faker.image.url({ width: 160, height: 160 }),
      trendingScore: artist.popularity * (0.5 + Math.random() * 0.5),
      lastSyncedAt: faker.date.recent({ days: 7 }),
    };
  });

  const createdArtists = await db
    .insert(artists)
    .values(artistsToCreate)
    .returning();

  // Create artist stats
  const statsToCreate = createdArtists.map((artist) => ({
    artistId: artist.id,
    totalShows: Math.floor(Math.random() * 50) + 10,
    totalSetlists: Math.floor(Math.random() * 30) + 5,
    avgSetlistLength: 15 + Math.random() * 10,
  }));

  await db.insert(artistStats).values(statsToCreate);
  return createdArtists;
}

async function seedVenues() {
  const venuesToCreate = venuesData.map((venue) => ({
    name: venue.name,
    slug: generateSlug(venue.name),
    address: faker.location.streetAddress(),
    city: venue.city,
    state: venue.state,
    country: venue.country,
    postalCode: faker.location.zipCode(),
    latitude: faker.location.latitude({ min: 25, max: 49 }),
    longitude: faker.location.longitude({ min: -125, max: -66 }),
    timezone: venue.timezone,
    capacity: venue.capacity,
    venueType: venue.venueType,
    phoneNumber: faker.phone.number(),
    website: faker.internet.url(),
    imageUrl: faker.image.url({ width: 800, height: 600 }),
    description: faker.lorem.paragraph(),
    amenities: JSON.stringify(['Parking', 'Food', 'Merchandise', 'Accessible']),
  }));

  const createdVenues = await db
    .insert(venues)
    .values(venuesToCreate)
    .returning();

  return createdVenues;
}

async function seedSongs(createdArtists: any[]) {
  const songsToCreate = [];

  for (const artist of createdArtists) {
    const genres = JSON.parse(artist.genres);
    const primaryGenre = genres[0] || 'pop';
    const songTitles =
      songTitlesByGenre[primaryGenre as keyof typeof songTitlesByGenre] ||
      songTitlesByGenre.pop;

    // Create 15-25 songs per artist
    const songCount = 15 + Math.floor(Math.random() * 11);

    for (let i = 0; i < songCount; i++) {
      const title =
        faker.helpers.arrayElement(songTitles) +
        (i > 5 ? ` ${faker.lorem.word()}` : '');

      songsToCreate.push({
        title,
        artist: artist.name,
        album: faker.lorem.words(2),
        albumArtUrl: faker.image.url({ width: 300, height: 300 }),
        releaseDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
        durationMs: 180000 + Math.floor(Math.random() * 120000), // 3-5 minutes
        popularity: Math.floor(artist.popularity * (0.5 + Math.random() * 0.5)),
        previewUrl: faker.internet.url(),
        isExplicit: Math.random() < 0.2,
        isPlayable: true,
        acousticness: Math.random().toString(),
        danceability: Math.random().toString(),
        energy: Math.random().toString(),
        valence: Math.random().toString(),
      });
    }
  }

  const createdSongs = await db.insert(songs).values(songsToCreate).returning();

  return createdSongs;
}

async function seedShows(createdArtists: any[], createdVenues: any[]) {
  const showsToCreate = [];
  const now = new Date();

  for (const artist of createdArtists) {
    // More popular artists get more shows
    const showCount = Math.floor((artist.popularity / 100) * 8) + 2;

    for (let i = 0; i < showCount; i++) {
      const venue = faker.helpers.arrayElement(createdVenues);
      const daysOffset = -30 + Math.floor(Math.random() * 90); // -30 to +60 days
      const showDate = new Date(
        now.getTime() + daysOffset * 24 * 60 * 60 * 1000
      );
      const isUpcoming = daysOffset > 0;
      const isRecent = daysOffset > -7 && daysOffset <= 0;

      const show = {
        headlinerArtistId: artist.id,
        venueId: venue.id,
        name: `${artist.name} at ${venue.name}`,
        slug: generateSlug(
          `${artist.name} ${venue.city} ${showDate.toISOString().split('T')[0]}`
        ),
        date: showDate.toISOString().split('T')[0],
        startTime: '20:00:00',
        doorsTime: '19:00:00',
        status: isUpcoming ? 'upcoming' : 'completed',
        description: faker.lorem.paragraph(),
        ticketUrl: isUpcoming ? faker.internet.url() : null,
        minPrice: Math.floor(50 + Math.random() * 100),
        maxPrice: Math.floor(150 + Math.random() * 350),
        viewCount: Math.floor(artist.popularity * (10 + Math.random() * 90)),
        attendeeCount: isUpcoming
          ? 0
          : Math.floor(venue.capacity * (0.6 + Math.random() * 0.4)),
        setlistCount: isUpcoming ? 1 : Math.floor(Math.random() * 5) + 1,
        voteCount: Math.floor(artist.popularity * (1 + Math.random() * 20)),
        trendingScore: calculateTrendingScore(showDate, artist.popularity),
        isFeatured: Math.random() < 0.1 && isUpcoming,
        isVerified: true,
        createdAt: faker.date.recent({ days: 30 }),
      };

      // Recent shows get higher trending scores
      if (isRecent) {
        show.trendingScore *= 2;
      }

      showsToCreate.push(show);
    }
  }

  const createdShows = await db.insert(shows).values(showsToCreate).returning();

  // Create show_artists relationships
  const showArtistsToCreate = createdShows.map((show) => ({
    showId: show.id,
    artistId: show.headlinerArtistId,
    orderIndex: 0,
    setLength: 90 + Math.floor(Math.random() * 30),
    isHeadliner: true,
  }));

  // Add some supporting artists
  for (let i = 0; i < createdShows.length; i++) {
    if (Math.random() < 0.6) {
      // 60% of shows have supporting acts
      const supportingArtist = faker.helpers.arrayElement(
        createdArtists.filter((a) => a.id !== createdShows[i].headlinerArtistId)
      );
      showArtistsToCreate.push({
        showId: createdShows[i].id,
        artistId: supportingArtist.id,
        orderIndex: 1,
        setLength: 30 + Math.floor(Math.random() * 15),
        isHeadliner: false,
      });
    }
  }

  await db.insert(showArtists).values(showArtistsToCreate);
  return createdShows;
}

async function seedSetlists(
  createdShows: any[],
  createdArtists: any[],
  createdSongs: any[]
) {
  const setlistsToCreate = [];
  const setlistSongsToCreate = [];

  // Group songs by artist
  const songsByArtist: Record<string, any[]> = {};
  for (const song of createdSongs) {
    if (!songsByArtist[song.artist]) {
      songsByArtist[song.artist] = [];
    }
    songsByArtist[song.artist].push(song);
  }

  for (const show of createdShows) {
    const artist = createdArtists.find((a) => a.id === show.headlinerArtistId);
    if (!artist) {
      continue;
    }

    const artistSongs = songsByArtist[artist.name] || [];
    if (artistSongs.length === 0) {
      continue;
    }

    // Create 1-3 setlists per show
    const setlistCount =
      show.status === 'upcoming' ? 1 : Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < setlistCount; i++) {
      const setlist = {
        showId: show.id,
        artistId: artist.id,
        type:
          i === 0
            ? 'predicted'
            : faker.helpers.arrayElement(['predicted', 'actual']),
        name: i === 0 ? 'Main Set' : `Setlist ${i + 1}`,
        orderIndex: i,
        isLocked: show.status === 'completed' && i === 0,
        totalVotes: Math.floor(Math.random() * 100),
        accuracyScore:
          show.status === 'completed' ? Math.floor(60 + Math.random() * 40) : 0,
        importedFrom: faker.helpers.arrayElement([
          'manual',
          'setlist.fm',
          'api',
        ]),
        importedAt: faker.date.recent({ days: 7 }),
      };

      setlistsToCreate.push(setlist);
    }
  }

  const createdSetlists = await db
    .insert(setlists)
    .values(setlistsToCreate)
    .returning();

  // Add songs to setlists
  for (const setlist of createdSetlists) {
    const artist = createdArtists.find((a) => a.id === setlist.artistId);
    if (!artist) {
      continue;
    }

    const artistSongs = songsByArtist[artist.name] || [];
    const songCount = 12 + Math.floor(Math.random() * 8); // 12-20 songs
    const selectedSongs = faker.helpers.arrayElements(
      artistSongs,
      Math.min(songCount, artistSongs.length)
    );

    for (let position = 0; position < selectedSongs.length; position++) {
      const song = selectedSongs[position];
      const upvotes = Math.floor(Math.random() * 50);
      const downvotes = Math.floor(Math.random() * 20);

      setlistSongsToCreate.push({
        setlistId: setlist.id,
        songId: song.id,
        position: position + 1,
        notes:
          position === 0
            ? 'Opener'
            : position === selectedSongs.length - 1
              ? 'Closer'
              : null,
        isPlayed: setlist.type === 'actual',
        upvotes,
        downvotes,
        netVotes: upvotes - downvotes,
      });
    }
  }

  const createdSetlistSongs = await db
    .insert(setlistSongs)
    .values(setlistSongsToCreate)
    .returning();
  return { createdSetlists, createdSetlistSongs };
}

async function seedUserActivity(
  createdUsers: any[],
  createdArtists: any[],
  createdSetlistSongs: any[],
  createdVenues: any[]
) {
  // User follows artists
  const followsToCreate = [];
  for (const user of createdUsers.slice(2)) {
    // Skip admin and moderator
    const followCount = Math.floor(Math.random() * 10) + 1;
    const artistsToFollow = faker.helpers.arrayElements(
      createdArtists,
      followCount
    );

    for (const artist of artistsToFollow) {
      followsToCreate.push({
        userId: user.id,
        artistId: artist.id,
      });
    }
  }

  await db.insert(userFollowsArtists).values(followsToCreate);

  // Update follower counts
  for (const artist of createdArtists) {
    const followerCount = followsToCreate.filter(
      (f) => f.artistId === artist.id
    ).length;
    await db
      .update(artists)
      .set({ followerCount })
      .where(eq(artists.id, artist.id));
  }

  // User votes on songs
  const votesToCreate = [];
  for (const user of createdUsers.slice(2)) {
    // Skip admin and moderator
    const voteCount = Math.floor(Math.random() * 30) + 10;
    const songsToVote = faker.helpers.arrayElements(
      createdSetlistSongs,
      Math.min(voteCount, createdSetlistSongs.length)
    );

    for (const setlistSong of songsToVote) {
      votesToCreate.push({
        userId: user.id,
        setlistSongId: setlistSong.id,
        voteType: Math.random() < 0.7 ? 'up' : 'down', // 70% upvotes
      });
    }
  }

  await db.insert(votes).values(votesToCreate);

  // Venue tips
  const tipsToCreate = [];
  const tipCategories = [
    'parking',
    'food',
    'access',
    'sound',
    'view',
    'general',
  ] as const;

  for (const venue of createdVenues) {
    const tipCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < tipCount; i++) {
      const user = faker.helpers.arrayElement(createdUsers.slice(2));

      tipsToCreate.push({
        venueId: venue.id,
        userId: user.id,
        content: faker.lorem.sentence(),
        category: faker.helpers.arrayElement(tipCategories),
        upvotes: Math.floor(Math.random() * 20),
      });
    }
  }

  await db.insert(venueTips).values(tipsToCreate);
}

async function updateAggregates() {
  // Update show vote counts
  await db.execute(sql`
    UPDATE shows s
    SET vote_count = (
      SELECT COUNT(*)
      FROM votes v
      JOIN setlist_songs ss ON v.setlist_song_id = ss.id
      JOIN setlists sl ON ss.setlist_id = sl.id
      WHERE sl.show_id = s.id
    )
  `);

  // Update setlist total votes
  await db.execute(sql`
    UPDATE setlists sl
    SET total_votes = (
      SELECT COUNT(*)
      FROM votes v
      JOIN setlist_songs ss ON v.setlist_song_id = ss.id
      WHERE ss.setlist_id = sl.id
    )
  `);

  // Update trending scores for recent shows
  await db.execute(sql`
    UPDATE shows
    SET trending_score = (view_count * 0.1 + vote_count * 0.5) * 
      POWER(0.5, EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 / 48.0)
    WHERE status IN ('upcoming', 'ongoing')
  `);

  // Update artist trending scores
  await db.execute(sql`
    UPDATE artists a
    SET trending_score = (
      SELECT COALESCE(AVG(s.trending_score), 0)
      FROM shows s
      WHERE s.headliner_artist_id = a.id
      AND s.date >= CURRENT_DATE - INTERVAL '30 days'
    )
  `);
}

async function main() {
  try {
    // Clear existing data
    await clearDatabase();

    // Seed data in order
    const createdUsers = await seedUsers();
    const createdArtists = await seedArtists();
    const createdVenues = await seedVenues();
    const createdSongs = await seedSongs(createdArtists);
    const createdShows = await seedShows(createdArtists, createdVenues);
    const { createdSetlists, createdSetlistSongs } = await seedSetlists(
      createdShows,
      createdArtists,
      createdSongs
    );
    await seedUserActivity(
      createdUsers,
      createdArtists,
      createdSetlistSongs,
      createdVenues
    );
    await updateAggregates();
    const topArtists = await db
      .select({
        name: artists.name,
        trendingScore: artists.trendingScore,
        followerCount: artists.followerCount,
      })
      .from(artists)
      .orderBy(sql`${artists.trendingScore} DESC`)
      .limit(5);

    topArtists.forEach((_artist) => {});
    const topShows = await db
      .select({
        name: shows.name,
        date: shows.date,
        trendingScore: shows.trendingScore,
        voteCount: shows.voteCount,
      })
      .from(shows)
      .orderBy(sql`${shows.trendingScore} DESC`)
      .limit(5);

    topShows.forEach((_show) => {});
  } catch (_error) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
