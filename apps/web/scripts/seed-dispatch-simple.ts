#!/usr/bin/env tsx

import {
  artistStats,
  artists,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  venues,
} from '@repo/database/src/schema';
import { eq } from 'drizzle-orm';
import { db } from './db-client';

async function main() {
  console.log('🎵 Populating Dispatch data (simplified version)...\n');

  try {
    // Step 1: Get or create Dispatch artist
    console.log('1️⃣ Setting up Dispatch artist...');

    let dispatchArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, 'dispatch'))
      .limit(1);

    if (dispatchArtist.length === 0) {
      // Create new
      dispatchArtist = await db
        .insert(artists)
        .values({
          spotifyId: '3jq7HNC7zNqdDc3oQPZEiu',
          ticketmasterId: 'K8vZ9171K-V',
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
          followerCount: 1245,
          monthlyListeners: 2184567,
          verified: true,
          bio: 'Dispatch is an American indie rock band. The band consists of Brad Corrigan, Pete Francis Heimbold, and Chad Urmston.',
          externalUrls: JSON.stringify({
            spotify: 'https://open.spotify.com/artist/3jq7HNC7zNqdDc3oQPZEiu',
            website: 'https://dispatchmusic.com/',
          }),
          lastSyncedAt: new Date(),
          songCatalogSyncedAt: new Date(),
          trendingScore: 85.5,
        })
        .returning();
    } else {
      // Update existing
      const [updated] = await db
        .update(artists)
        .set({
          ticketmasterId: 'K8vZ9171K-V',
          imageUrl:
            'https://i.scdn.co/image/ab6761610000e5eb0a7388b95df960b5c0ed8e46',
          smallImageUrl:
            'https://i.scdn.co/image/ab6761610000517a0a7388b95df960b5c0ed8e46',
          popularity: 65,
          followers: 528493,
          monthlyListeners: 2184567,
          verified: true,
          trendingScore: 85.5,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, dispatchArtist[0].id))
        .returning();
      dispatchArtist = [updated];
    }

    const dispatchArtistData = dispatchArtist[0];
    console.log('✅ Dispatch artist ready!');

    // Step 2: Ensure venues exist
    console.log('\n2️⃣ Setting up venues...');

    // Just ensure Red Rocks exists for testing
    const [redRocks] = await db
      .insert(venues)
      .values({
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
        description: 'Iconic outdoor amphitheatre',
        imageUrl:
          'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14',
      })
      .onConflictDoUpdate({
        target: venues.slug,
        set: { updatedAt: new Date() },
      })
      .returning();

    console.log('✅ Venue ready!');

    // Step 3: Create a test show
    console.log('\n3️⃣ Creating test show...');

    const today = new Date();
    const [show] = await db
      .insert(shows)
      .values({
        headlinerArtistId: dispatchArtistData.id,
        venueId: redRocks.id,
        name: 'Dispatch: Summer Tour 2025',
        slug: 'dispatch-summer-tour-2025-red-rocks-test',
        date: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        startTime: '19:30',
        doorsTime: '18:00',
        status: 'upcoming',
        description: 'Dispatch returns to Red Rocks',
        ticketUrl: 'https://tickets.example.com/dispatch-red-rocks',
        minPrice: 45,
        maxPrice: 125,
        viewCount: 3421,
        attendeeCount: 1205,
        trendingScore: 92.5,
        isFeatured: true,
        isVerified: true,
      })
      .onConflictDoNothing()
      .returning();

    if (show) {
      await db
        .insert(showArtists)
        .values({
          showId: show.id,
          artistId: dispatchArtistData.id,
          orderIndex: 0,
          isHeadliner: true,
          setLength: 120,
        })
        .onConflictDoNothing();

      console.log('✅ Show created!');
    }

    // Step 4: Create essential songs
    console.log('\n4️⃣ Creating essential Dispatch songs...');

    const essentialSongs = [
      {
        title: 'The General',
        spotifyId: '3GYlZ7tbxLOxe6ewMNVTkw',
        popularity: 65,
      },
      {
        title: 'Out Loud',
        spotifyId: '0fuPiTd5WXR3pGitDAON30',
        popularity: 58,
      },
      { title: 'Elias', spotifyId: '5p9CTsn5ueGU4oScNX1axw', popularity: 51 },
      { title: 'Bang Bang', popularity: 62 },
      { title: 'Two Coins', popularity: 55 },
      { title: 'Bats in the Belfry', popularity: 58 },
      { title: 'Flying Horses', popularity: 54 },
      { title: 'Carry You', popularity: 59 },
      { title: 'Open Up', popularity: 48 },
      { title: 'Here We Go', popularity: 52 },
    ];

    for (const song of essentialSongs) {
      await db
        .insert(songs)
        .values({
          spotifyId: song.spotifyId,
          title: song.title,
          artist: 'Dispatch',
          album: 'Various',
          durationMs: 240000,
          popularity: song.popularity,
          isExplicit: false,
        })
        .onConflictDoNothing();
    }

    const dispatchSongs = await db
      .select()
      .from(songs)
      .where(eq(songs.artist, 'Dispatch'))
      .limit(10);

    console.log(`✅ ${dispatchSongs.length} songs ready!`);

    // Step 5: Create a sample setlist
    if (show && dispatchSongs.length > 0) {
      console.log('\n5️⃣ Creating sample setlist...');

      const [setlist] = await db
        .insert(setlists)
        .values({
          showId: show.id,
          artistId: dispatchArtistData.id,
          type: 'predicted',
          name: 'Fan Predictions',
          orderIndex: 0,
          isLocked: false,
          totalVotes: 0,
          accuracyScore: 0,
        })
        .onConflictDoNothing()
        .returning();

      if (setlist) {
        // Add songs to setlist
        for (let i = 0; i < Math.min(dispatchSongs.length, 8); i++) {
          const song = dispatchSongs[i];
          const upvotes = Math.floor(Math.random() * 100) + 20;
          const downvotes = Math.floor(Math.random() * 20);

          await db
            .insert(setlistSongs)
            .values({
              setlistId: setlist.id,
              songId: song.id,
              position: i + 1,
              notes: i === 0 ? 'opener' : i === 7 ? 'closer' : null,
              upvotes,
              downvotes,
              netVotes: upvotes - downvotes,
            })
            .onConflictDoNothing();
        }

        console.log('✅ Setlist created with songs!');
      }
    }

    // Step 6: Update stats
    console.log('\n6️⃣ Updating stats...');

    await db
      .insert(artistStats)
      .values({
        artistId: dispatchArtistData.id,
        totalShows: 1,
        totalSetlists: 1,
        avgSetlistLength: 8,
        mostPlayedSong: 'The General',
        lastShowDate: new Date(),
      })
      .onConflictDoUpdate({
        target: artistStats.artistId,
        set: {
          totalShows: 1,
          totalSetlists: 1,
          updatedAt: new Date(),
        },
      });

    console.log('✅ Stats updated!');

    // Final summary
    console.log('\n🎉 Dispatch data population completed!');
    console.log('\n✨ You can now:');
    console.log('- Search for "Dispatch"');
    console.log('- Visit http://localhost:3002/artists/dispatch');
    console.log('- View the test show and setlist');
    console.log('- Test voting on the predicted setlist');
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
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
