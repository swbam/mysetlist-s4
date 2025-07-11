#!/usr/bin/env tsx

import { db } from '@repo/database';
import {
  artists,
  artistSongs,
  shows,
  showArtists,
  songs,
  venues,
  setlists,
  setlistSongs,
  userVotes,
  users,
  userProfiles,
} from '@repo/database';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Popular artists to seed
const POPULAR_ARTISTS = [
  {
    name: 'Taylor Swift',
    spotifyId: '06HL4z0CvFAxyc27GXpf02',
    genres: ['pop', 'country', 'indie'],
    popularity: 100,
    followers: 95000000,
  },
  {
    name: 'The Weeknd',
    spotifyId: '1Xyo4u8uXC1ZmMpatF05PJ',
    genres: ['r&b', 'pop', 'alternative r&b'],
    popularity: 95,
    followers: 90000000,
  },
  {
    name: 'Billie Eilish',
    spotifyId: '6qqNVTkY8uBg9cP3Jd7DAH',
    genres: ['electropop', 'pop', 'art pop'],
    popularity: 93,
    followers: 106000000,
  },
  {
    name: 'Drake',
    spotifyId: '3TVXtAsR1Inumwj472S9r4',
    genres: ['hip hop', 'rap', 'pop rap'],
    popularity: 94,
    followers: 88000000,
  },
  {
    name: 'Arctic Monkeys',
    spotifyId: '7Ln80lUS6He07XvHI8qqHH',
    genres: ['indie rock', 'alternative rock', 'garage rock'],
    popularity: 83,
    followers: 24000000,
  },
];

// Sample venues
const SAMPLE_VENUES = [
  {
    name: 'Madison Square Garden',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    capacity: 20000,
    latitude: 40.7505,
    longitude: -73.9934,
  },
  {
    name: 'The Forum',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    capacity: 17500,
    latitude: 33.9583,
    longitude: -118.3417,
  },
  {
    name: 'United Center',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    capacity: 20917,
    latitude: 41.8807,
    longitude: -87.6742,
  },
  {
    name: 'O2 Arena',
    city: 'London',
    state: null,
    country: 'UK',
    capacity: 20000,
    latitude: 51.5033,
    longitude: 0.0032,
  },
  {
    name: 'Red Rocks Amphitheatre',
    city: 'Morrison',
    state: 'CO',
    country: 'USA',
    capacity: 9525,
    latitude: 39.6654,
    longitude: -105.2057,
  },
];

// Sample songs for each artist
const SAMPLE_SONGS = {
  'Taylor Swift': [
    'Anti-Hero',
    'Blank Space',
    'Shake It Off',
    'Love Story',
    'You Belong With Me',
    'All Too Well',
    'Karma',
    'Cruel Summer',
  ],
  'The Weeknd': [
    'Blinding Lights',
    'Save Your Tears',
    'Starboy',
    'The Hills',
    "Can't Feel My Face",
    'Die For You',
    'After Hours',
    'Out of Time',
  ],
  'Billie Eilish': [
    'bad guy',
    'when the party\'s over',
    'lovely',
    'everything i wanted',
    'happier than ever',
    'ocean eyes',
    'bury a friend',
    'my future',
  ],
  'Drake': [
    'One Dance',
    'God\'s Plan',
    'Hotline Bling',
    'In My Feelings',
    'Started From the Bottom',
    'Nice For What',
    'Hold On, We\'re Going Home',
    'Jimmy Cooks',
  ],
  'Arctic Monkeys': [
    'Do I Wanna Know?',
    'R U Mine?',
    'Fluorescent Adolescent',
    'When The Sun Goes Down',
    '505',
    'Why\'d You Only Call Me When You\'re High?',
    'I Bet You Look Good on the Dancefloor',
    'Arabella',
  ],
};

async function seedDevelopmentData() {
  console.log('🌱 Starting development data seed...');

  try {
    // Create test user
    console.log('Creating test user...');
    const [testUser] = await db
      .insert(users)
      .values({
        id: createId(),
        email: 'test@mysetlist.com',
        emailVerified: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (testUser) {
      await db
        .insert(userProfiles)
        .values({
          userId: testUser.id,
          username: 'testuser',
          displayName: 'Test User',
          bio: 'Development test account',
        })
        .onConflictDoNothing();
    }

    // Seed venues
    console.log('Seeding venues...');
    const seededVenues = [];
    for (const venue of SAMPLE_VENUES) {
      const [seededVenue] = await db
        .insert(venues)
        .values({
          ...venue,
          slug: venue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        })
        .onConflictDoUpdate({
          target: venues.slug,
          set: {
            capacity: venue.capacity,
            updatedAt: new Date(),
          },
        })
        .returning();
      seededVenues.push(seededVenue);
    }

    // Seed artists and their songs
    console.log('Seeding artists and songs...');
    for (const artistData of POPULAR_ARTISTS) {
      const [artist] = await db
        .insert(artists)
        .values({
          ...artistData,
          slug: artistData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          genres: JSON.stringify(artistData.genres),
          imageUrl: `https://via.placeholder.com/640x640?text=${encodeURIComponent(artistData.name)}`,
          smallImageUrl: `https://via.placeholder.com/160x160?text=${encodeURIComponent(artistData.name)}`,
          verified: true,
          trendingScore: Math.random() * 100,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: artists.spotifyId,
          set: {
            popularity: artistData.popularity,
            followers: artistData.followers,
            trendingScore: Math.random() * 100,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Seed songs for this artist
      const artistSongList = SAMPLE_SONGS[artistData.name] || [];
      for (let i = 0; i < artistSongList.length; i++) {
        const songTitle = artistSongList[i];
        const [song] = await db
          .insert(songs)
          .values({
            spotifyId: `${artist.spotifyId}_song_${i}`,
            title: songTitle,
            artist: artist.name,
            album: `${artist.name} - Greatest Hits`,
            albumArtUrl: artist.imageUrl,
            durationMs: 180000 + Math.random() * 120000, // 3-5 minutes
            popularity: 50 + Math.floor(Math.random() * 50),
            isPlayable: true,
          })
          .onConflictDoNothing()
          .returning();

        if (song) {
          await db
            .insert(artistSongs)
            .values({
              artistId: artist.id,
              songId: song.id,
              isPrimaryArtist: true,
            })
            .onConflictDoNothing();
        }
      }

      // Create upcoming shows for popular artists
      console.log(`Creating shows for ${artist.name}...`);
      const numShows = Math.floor(Math.random() * 3) + 2; // 2-4 shows
      
      for (let i = 0; i < numShows; i++) {
        const venue = seededVenues[Math.floor(Math.random() * seededVenues.length)];
        const showDate = new Date();
        showDate.setDate(showDate.getDate() + Math.floor(Math.random() * 90) + 30); // 30-120 days in future

        const [show] = await db
          .insert(shows)
          .values({
            headlinerArtistId: artist.id,
            venueId: venue.id,
            name: `${artist.name} at ${venue.name}`,
            slug: `${artist.slug}-${venue.slug}-${showDate.toISOString().split('T')[0]}`,
            date: showDate.toISOString().split('T')[0],
            startTime: '20:00',
            doorsTime: '19:00',
            status: 'upcoming',
            description: `Don't miss ${artist.name} live at ${venue.name}!`,
            minPrice: 50 + Math.floor(Math.random() * 100),
            maxPrice: 150 + Math.floor(Math.random() * 200),
            viewCount: Math.floor(Math.random() * 1000),
            attendeeCount: Math.floor(Math.random() * 500),
            voteCount: Math.floor(Math.random() * 200),
            trendingScore: Math.random() * 50,
            isVerified: true,
          })
          .onConflictDoNothing()
          .returning();

        if (show) {
          // Add the artist to the show
          await db
            .insert(showArtists)
            .values({
              showId: show.id,
              artistId: artist.id,
              orderIndex: 0,
              isHeadliner: true,
            })
            .onConflictDoNothing();

          // Create a sample setlist for some shows
          if (Math.random() > 0.5) {
            const [setlist] = await db
              .insert(setlists)
              .values({
                showId: show.id,
                userId: testUser?.id || createId(),
                name: `${artist.name} Setlist`,
                isOfficial: true,
                voteCount: Math.floor(Math.random() * 100),
              })
              .returning();

            if (setlist) {
              // Add songs to setlist
              const setlistSongCount = 10 + Math.floor(Math.random() * 10); // 10-20 songs
              const availableSongs = await db
                .select()
                .from(songs)
                .innerJoin(artistSongs, eq(artistSongs.songId, songs.id))
                .where(eq(artistSongs.artistId, artist.id))
                .limit(setlistSongCount);

              for (let j = 0; j < availableSongs.length; j++) {
                await db
                  .insert(setlistSongs)
                  .values({
                    setlistId: setlist.id,
                    songId: availableSongs[j].songs.id,
                    orderIndex: j,
                  })
                  .onConflictDoNothing();
              }

              // Add some votes
              if (testUser) {
                await db
                  .insert(userVotes)
                  .values({
                    userId: testUser.id,
                    setlistId: setlist.id,
                    value: 1,
                  })
                  .onConflictDoNothing();
              }
            }
          }
        }
      }
    }

    // Update artist stats
    console.log('Updating artist statistics...');
    for (const artistData of POPULAR_ARTISTS) {
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, artistData.spotifyId))
        .limit(1);

      if (artist) {
        const [showCount] = await db
          .select({ count: db.count() })
          .from(shows)
          .where(eq(shows.headlinerArtistId, artist.id));

        const [songCount] = await db
          .select({ count: db.count() })
          .from(artistSongs)
          .where(eq(artistSongs.artistId, artist.id));

        await db
          .update(artists)
          .set({
            totalShows: showCount?.count || 0,
            upcomingShows: showCount?.count || 0,
            totalSongs: songCount?.count || 0,
            updatedAt: new Date(),
          })
          .where(eq(artists.id, artist.id));
      }
    }

    console.log('✅ Development data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding development data:', error);
    throw error;
  }
}

// Run the seed script
seedDevelopmentData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });