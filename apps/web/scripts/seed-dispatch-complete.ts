#!/usr/bin/env tsx

import {
  artists,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  users,
  venues,
  votes,
} from '@repo/database/src/schema';
import { eq, sql } from 'drizzle-orm';
import { db } from './db-client';

async function main() {
  console.log('🎵 Starting comprehensive Dispatch data population...\n');

  try {
    // Step 1: Create or update Dispatch artist
    console.log('1️⃣ Creating Dispatch artist...');

    const [dispatchArtist] = await db
      .insert(artists)
      .values({
        spotifyId: '3jq7HNC7zNqdDc3oQPZEiu', // Real Spotify ID for Dispatch
        ticketmasterId: 'K8vZ9171K-V', // Example Ticketmaster ID
        name: 'Dispatch',
        slug: 'dispatch',
        imageUrl:
          'https://i.scdn.co/image/ab6761610000e5eb0a7388b95df960b5c0ed8e46',
        smallImageUrl:
          'https://i.scdn.co/image/ab6761610000517a0a7388b95df960b5c0ed8e46',
        genres: JSON.stringify([
          'indie rock',
          'jam band',
          'alternative rock',
          'folk rock',
        ]),
        popularity: 65,
        followers: 528493,
        followerCount: 1245, // App followers
        monthlyListeners: 2184567,
        verified: true,
        bio: 'Dispatch is an American indie rock band. The band consists of Brad Corrigan, Pete Francis Heimbold, and Chad Urmston. The band originated in the early 1990s as One Fell Swoop, but changed their name to Dispatch in 1996. They are known for their grassroots fanbase and socially conscious lyrics.',
        externalUrls: JSON.stringify({
          spotify: 'https://open.spotify.com/artist/3jq7HNC7zNqdDc3oQPZEiu',
          website: 'https://dispatchmusic.com/',
          instagram: 'https://www.instagram.com/dispatch/',
          twitter: 'https://twitter.com/dispatch',
        }),
        lastSyncedAt: new Date(),
        songCatalogSyncedAt: new Date(),
        trendingScore: 85.5,
      })
      .onConflictDoUpdate({
        target: artists.spotifyId,
        set: {
          popularity: 65,
          followers: 528493,
          monthlyListeners: 2184567,
          trendingScore: 85.5,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log('✅ Dispatch artist created/updated successfully!');

    // Step 2: Create venues for shows
    console.log('\n2️⃣ Creating venues...');

    const venueData = [
      {
        name: 'Red Rocks Amphitheatre',
        slug: 'red-rocks-amphitheatre',
        city: 'Morrison',
        state: 'CO',
        country: 'United States',
        address: '18300 W Alameda Pkwy',
        postalCode: '80465',
        latitude: 39.6654,
        longitude: -105.2057,
        timezone: 'America/Denver',
        capacity: 9525,
        venueType: 'amphitheatre',
        description:
          'Iconic outdoor amphitheatre known for natural acoustics and stunning views',
        imageUrl:
          'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14',
        website: 'https://www.redrocksonline.com',
      },
      {
        name: 'House of Blues Boston',
        slug: 'house-of-blues-boston',
        city: 'Boston',
        state: 'MA',
        country: 'United States',
        address: '15 Lansdowne St',
        postalCode: '02215',
        latitude: 42.3467,
        longitude: -71.0951,
        timezone: 'America/New_York',
        capacity: 2425,
        venueType: 'club',
        description: 'Live music venue featuring rock, blues & soul acts',
        website: 'https://www.houseofblues.com/boston',
      },
      {
        name: 'The Fillmore',
        slug: 'the-fillmore-sf',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
        address: '1805 Geary Blvd',
        postalCode: '94115',
        latitude: 37.7842,
        longitude: -122.4332,
        timezone: 'America/Los_Angeles',
        capacity: 1315,
        venueType: 'theater',
        description: 'Historic music venue in San Francisco',
        website: 'https://www.thefillmore.com',
      },
      {
        name: '9:30 Club',
        slug: '930-club',
        city: 'Washington',
        state: 'DC',
        country: 'United States',
        address: '815 V St NW',
        postalCode: '20001',
        latitude: 38.918,
        longitude: -77.0234,
        timezone: 'America/New_York',
        capacity: 1200,
        venueType: 'club',
        description: 'Legendary nightclub known for live music performances',
        website: 'https://www.930.com',
      },
      {
        name: 'The Bowery Ballroom',
        slug: 'bowery-ballroom',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        address: '6 Delancey St',
        postalCode: '10002',
        latitude: 40.7205,
        longitude: -73.9935,
        timezone: 'America/New_York',
        capacity: 575,
        venueType: 'ballroom',
        description: 'Intimate music venue in Manhattan',
        website: 'https://www.boweryballroom.com',
      },
    ];

    const createdVenues = await db
      .insert(venues)
      .values(venueData)
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Created ${createdVenues.length} venues`);

    // Get all venues for shows
    const allVenues = await db
      .select()
      .from(venues)
      .where(
        sql`slug IN ('red-rocks-amphitheatre', 'house-of-blues-boston', 'the-fillmore-sf', '930-club', 'bowery-ballroom')`
      );

    // Step 3: Create shows for Dispatch
    console.log('\n3️⃣ Creating shows for Dispatch...');

    const today = new Date();
    const showsData = [
      {
        headlinerArtistId: dispatchArtist.id,
        venueId: allVenues.find((v) => v.slug === 'red-rocks-amphitheatre')?.id,
        name: 'Dispatch: Summer Tour 2025',
        slug: 'dispatch-summer-tour-2025-red-rocks',
        date: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 45 days from now
        startTime: '19:30',
        doorsTime: '18:00',
        status: 'upcoming' as const,
        description:
          'Dispatch returns to Red Rocks for an unforgettable summer evening',
        ticketUrl: 'https://tickets.example.com/dispatch-red-rocks',
        minPrice: 45,
        maxPrice: 125,
        viewCount: 3421,
        attendeeCount: 1205,
        setlistCount: 2,
        voteCount: 4523,
        trendingScore: 92.5,
        isFeatured: true,
        isVerified: true,
      },
      {
        headlinerArtistId: dispatchArtist.id,
        venueId: allVenues.find((v) => v.slug === 'house-of-blues-boston')?.id,
        name: 'Dispatch: Hometown Heroes',
        slug: 'dispatch-hometown-heroes-boston',
        date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 10 days ago
        startTime: '20:00',
        doorsTime: '19:00',
        status: 'completed' as const,
        description: 'Dispatch returns home to Boston for an intimate show',
        ticketUrl: 'https://tickets.example.com/dispatch-boston',
        minPrice: 35,
        maxPrice: 75,
        viewCount: 5234,
        attendeeCount: 2100,
        setlistCount: 3,
        voteCount: 8934,
        trendingScore: 78.3,
        isVerified: true,
      },
      {
        headlinerArtistId: dispatchArtist.id,
        venueId: allVenues.find((v) => v.slug === 'the-fillmore-sf')?.id,
        name: 'Dispatch: West Coast Winter Tour',
        slug: 'dispatch-west-coast-fillmore',
        date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 30 days from now
        startTime: '21:00',
        doorsTime: '20:00',
        status: 'upcoming' as const,
        description:
          'Dispatch brings their acoustic magic to the legendary Fillmore',
        ticketUrl: 'https://tickets.example.com/dispatch-fillmore',
        minPrice: 40,
        maxPrice: 85,
        viewCount: 2156,
        attendeeCount: 543,
        setlistCount: 1,
        voteCount: 2341,
        trendingScore: 71.2,
        isVerified: true,
      },
      {
        headlinerArtistId: dispatchArtist.id,
        venueId: allVenues.find((v) => v.slug === '930-club')?.id,
        name: 'Dispatch: Capital Sessions',
        slug: 'dispatch-capital-sessions-dc',
        date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 25 days ago
        startTime: '20:30',
        doorsTime: '19:30',
        status: 'completed' as const,
        description: 'An unforgettable night at the legendary 9:30 Club',
        ticketUrl: 'https://tickets.example.com/dispatch-dc',
        minPrice: 38,
        maxPrice: 68,
        viewCount: 3890,
        attendeeCount: 1100,
        setlistCount: 2,
        voteCount: 5672,
        trendingScore: 65.8,
        isVerified: true,
      },
      {
        headlinerArtistId: dispatchArtist.id,
        venueId: allVenues.find((v) => v.slug === 'bowery-ballroom')?.id,
        name: 'Dispatch: Intimate NYC Night',
        slug: 'dispatch-intimate-nyc-bowery',
        date: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 60 days from now
        startTime: '21:30',
        doorsTime: '20:30',
        status: 'upcoming' as const,
        description: 'A rare intimate performance in the heart of NYC',
        ticketUrl: 'https://tickets.example.com/dispatch-bowery',
        minPrice: 50,
        maxPrice: 95,
        viewCount: 4321,
        attendeeCount: 432,
        setlistCount: 1,
        voteCount: 1823,
        trendingScore: 88.1,
        isFeatured: true,
        isVerified: true,
      },
    ];

    const createdShows = await db
      .insert(shows)
      .values(showsData)
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Created ${createdShows.length} shows`);

    // Create show_artists entries
    for (const show of createdShows) {
      await db
        .insert(showArtists)
        .values({
          showId: show.id,
          artistId: dispatchArtist.id,
          orderIndex: 0,
          isHeadliner: true,
          setLength: 120,
        })
        .onConflictDoNothing();
    }

    // Step 4: Create Dispatch songs
    console.log('\n4️⃣ Creating Dispatch song catalog...');

    const dispatchSongs = [
      {
        spotifyId: '3GYlZ7tbxLOxe6ewMNVTkw',
        title: 'The General',
        artist: 'Dispatch',
        album: 'Bang Bang',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b273ce6d0eef0c1ce77e5f95bbbc',
        durationMs: 239706,
        popularity: 65,
        isExplicit: false,
      },
      {
        spotifyId: '0fuPiTd5WXR3pGitDAON30',
        title: 'Out Loud',
        artist: 'Dispatch',
        album: 'Silent Steeples',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2739a3eff0e50af3262c25a0de6',
        durationMs: 226133,
        popularity: 58,
        isExplicit: false,
      },
      {
        spotifyId: '5p9CTsn5ueGU4oScNX1axw',
        title: 'Elias',
        artist: 'Dispatch',
        album: 'Silent Steeples',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2739a3eff0e50af3262c25a0de6',
        durationMs: 263506,
        popularity: 51,
        isExplicit: false,
      },
      {
        title: 'Bang Bang',
        artist: 'Dispatch',
        album: 'Bang Bang',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b273ce6d0eef0c1ce77e5f95bbbc',
        durationMs: 215000,
        popularity: 62,
        isExplicit: false,
      },
      {
        title: 'Two Coins',
        artist: 'Dispatch',
        album: 'Bang Bang',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b273ce6d0eef0c1ce77e5f95bbbc',
        durationMs: 198000,
        popularity: 55,
        isExplicit: false,
      },
      {
        title: 'Bats in the Belfry',
        artist: 'Dispatch',
        album: 'Bang Bang',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b273ce6d0eef0c1ce77e5f95bbbc',
        durationMs: 241000,
        popularity: 58,
        isExplicit: false,
      },
      {
        title: 'Flying Horses',
        artist: 'Dispatch',
        album: 'Silent Steeples',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2739a3eff0e50af3262c25a0de6',
        durationMs: 219000,
        popularity: 54,
        isExplicit: false,
      },
      {
        title: 'Carry You',
        artist: 'Dispatch',
        album: 'Circles Around the Sun',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2732cb16543ff3f75e9e2f7f366',
        durationMs: 235000,
        popularity: 59,
        isExplicit: false,
      },
      {
        title: 'Open Up',
        artist: 'Dispatch',
        album: 'Four Day Trials',
        durationMs: 201000,
        popularity: 48,
        isExplicit: false,
      },
      {
        title: 'Passerby',
        artist: 'Dispatch',
        album: 'Silent Steeples',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2739a3eff0e50af3262c25a0de6',
        durationMs: 187000,
        popularity: 46,
        isExplicit: false,
      },
      {
        title: 'Here We Go',
        artist: 'Dispatch',
        album: 'Who Are We Living For?',
        durationMs: 223000,
        popularity: 52,
        isExplicit: false,
      },
      {
        title: 'Time Served',
        artist: 'Dispatch',
        album: 'Silent Steeples',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2739a3eff0e50af3262c25a0de6',
        durationMs: 256000,
        popularity: 45,
        isExplicit: false,
      },
      {
        title: 'Mission',
        artist: 'Dispatch',
        album: 'Bang Bang',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b273ce6d0eef0c1ce77e5f95bbbc',
        durationMs: 211000,
        popularity: 49,
        isExplicit: false,
      },
      {
        title: 'Prince of Spades',
        artist: 'Dispatch',
        album: 'Four Day Trials',
        durationMs: 245000,
        popularity: 47,
        isExplicit: false,
      },
      {
        title: 'Steeples',
        artist: 'Dispatch',
        album: 'Silent Steeples',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2739a3eff0e50af3262c25a0de6',
        durationMs: 178000,
        popularity: 44,
        isExplicit: false,
      },
      {
        title: 'Questioned Apocalypse',
        artist: 'Dispatch',
        album: 'Four Day Trials',
        durationMs: 267000,
        popularity: 43,
        isExplicit: false,
      },
      {
        title: 'Bridges',
        artist: 'Dispatch',
        album: 'Silent Steeples',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b2739a3eff0e50af3262c25a0de6',
        durationMs: 192000,
        popularity: 42,
        isExplicit: false,
      },
      {
        title: 'Walk With You',
        artist: 'Dispatch',
        album: 'Four Day Trials',
        durationMs: 208000,
        popularity: 41,
        isExplicit: false,
      },
      {
        title: 'Whirlwind',
        artist: 'Dispatch',
        album: 'Bang Bang',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b273ce6d0eef0c1ce77e5f95bbbc',
        durationMs: 234000,
        popularity: 46,
        isExplicit: false,
      },
      {
        title: 'Railway Station',
        artist: 'Dispatch',
        album: 'Bang Bang',
        albumArtUrl:
          'https://i.scdn.co/image/ab67616d0000b273ce6d0eef0c1ce77e5f95bbbc',
        durationMs: 221000,
        popularity: 45,
        isExplicit: false,
      },
    ];

    const createdSongs = await db
      .insert(songs)
      .values(dispatchSongs)
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Created ${createdSongs.length} songs`);

    // Get all songs for setlists
    const allSongs = await db
      .select()
      .from(songs)
      .where(eq(songs.artist, 'Dispatch'));

    // Step 5: Create setlists and votes
    console.log('\n5️⃣ Creating setlists and votes...');

    // Create a test user for votes
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    let setlistCount = 0;
    let voteCount = 0;

    for (const show of createdShows) {
      // Create 1-3 setlists per show
      const numSetlists = show.status === 'completed' ? 2 : 1;

      for (let i = 0; i < numSetlists; i++) {
        const setlistType = i === 0 ? 'predicted' : 'actual';

        const [setlist] = await db
          .insert(setlists)
          .values({
            showId: show.id,
            artistId: dispatchArtist.id,
            type: setlistType,
            name:
              setlistType === 'predicted'
                ? 'Fan Predictions'
                : 'Actual Setlist',
            orderIndex: i,
            isLocked: setlistType === 'actual',
            totalVotes: 0,
            accuracyScore: setlistType === 'actual' ? 95 : 0,
            createdBy: testUser?.id,
          })
          .returning();

        setlistCount++;

        // Add 15-20 songs to each setlist
        const shuffledSongs = [...allSongs].sort(() => Math.random() - 0.5);
        const setlistSongCount = Math.floor(Math.random() * 6) + 15; // 15-20 songs

        for (
          let position = 0;
          position < setlistSongCount && position < shuffledSongs.length;
          position++
        ) {
          const song = shuffledSongs[position];

          const [setlistSong] = await db
            .insert(setlistSongs)
            .values({
              setlistId: setlist.id,
              songId: song.id,
              position: position + 1,
              notes:
                position === 0
                  ? 'opener'
                  : position === setlistSongCount - 1
                    ? 'closer'
                    : null,
              isPlayed: setlistType === 'actual' ? true : null,
              upvotes: Math.floor(Math.random() * 150),
              downvotes: Math.floor(Math.random() * 30),
              netVotes: 0, // Will be calculated by trigger
            })
            .returning();

          // Add some votes for predicted setlists
          if (setlistType === 'predicted' && testUser && Math.random() > 0.5) {
            await db
              .insert(votes)
              .values({
                userId: testUser.id,
                setlistSongId: setlistSong.id,
                voteType: Math.random() > 0.3 ? 'up' : 'down',
              })
              .onConflictDoNothing();

            voteCount++;
          }
        }
      }
    }

    console.log(`✅ Created ${setlistCount} setlists with songs`);
    console.log(`✅ Created ${voteCount} votes`);

    // Step 6: Update vote counts and trending scores
    console.log('\n6️⃣ Updating aggregated data...');

    // Update net votes for all setlist songs
    await db.execute(sql`
      UPDATE setlist_songs 
      SET net_votes = upvotes - downvotes
    `);

    // Update total votes for setlists
    await db.execute(sql`
      UPDATE setlists s
      SET total_votes = (
        SELECT COALESCE(SUM(ss.upvotes + ss.downvotes), 0)
        FROM setlist_songs ss
        WHERE ss.setlist_id = s.id
      )
    `);

    // Update artist stats
    await db.execute(sql`
      INSERT INTO artist_stats (artist_id, total_shows, total_setlists, last_show_date)
      SELECT 
        a.id,
        COUNT(DISTINCT s.id) as total_shows,
        COUNT(DISTINCT sl.id) as total_setlists,
        MAX(s.date::timestamp) as last_show_date
      FROM artists a
      LEFT JOIN shows s ON s.headliner_artist_id = a.id
      LEFT JOIN setlists sl ON sl.artist_id = a.id
      WHERE a.id = ${dispatchArtist.id}
      GROUP BY a.id
      ON CONFLICT (artist_id) 
      DO UPDATE SET
        total_shows = EXCLUDED.total_shows,
        total_setlists = EXCLUDED.total_setlists,
        last_show_date = EXCLUDED.last_show_date,
        updated_at = NOW()
    `);

    console.log('✅ Updated all aggregated data');

    // Step 7: Final summary
    console.log('\n🎉 Dispatch data population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(
      `- Artist: Dispatch (${dispatchArtist.followers.toLocaleString()} Spotify followers)`
    );
    console.log(`- Venues: ${allVenues.length} venues created`);
    console.log(`- Shows: ${createdShows.length} shows (upcoming and past)`);
    console.log(`- Songs: ${createdSongs.length} songs in catalog`);
    console.log(`- Setlists: ${setlistCount} setlists with full song lists`);
    console.log(`- Votes: ${voteCount} sample votes`);

    console.log('\n✨ You can now test:');
    console.log('- Search for "Dispatch" in the search bar');
    console.log('- Visit /artists/dispatch to see the artist page');
    console.log('- Check individual show pages for setlists');
    console.log('- View trending data on the trending page');
    console.log('- Test voting functionality on predicted setlists');
  } catch (error) {
    console.error('❌ Error populating data:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
