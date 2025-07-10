#!/usr/bin/env tsx

import { db, sql } from './db-client';

async function main() {
  try {
    // First check if Dispatch exists
    const dispatchCheck = await db.execute(sql`
      SELECT id, name, slug FROM artists WHERE slug = 'dispatch'
    `);

    if (!dispatchCheck.rows.length) {
      process.exit(1);
    }

    const dispatch = dispatchCheck.rows[0];

    // Get Madison Square Garden venue
    const msgCheck = await db.execute(sql`
      SELECT id, name, slug FROM venues WHERE slug = 'madison-square-garden'
    `);

    if (!msgCheck.rows.length) {
      process.exit(1);
    }

    const msg = msgCheck.rows[0];

    // Create upcoming and past shows for Dispatch
    const showsData = [
      {
        name: 'Dispatch at Madison Square Garden',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'upcoming',
        slug: 'dispatch-madison-square-garden-2025',
      },
      {
        name: 'Dispatch Summer Tour - NYC',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        status: 'completed',
        slug: 'dispatch-summer-tour-nyc-2024',
      },
      {
        name: 'Dispatch Acoustic Set',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'upcoming',
        slug: 'dispatch-acoustic-set-2025',
      },
    ];

    for (const showData of showsData) {
      // Check if show already exists
      const existingShow = await db.execute(sql`
        SELECT id FROM shows WHERE slug = ${showData.slug}
      `);

      if (existingShow.rows.length) {
        continue;
      }

      // Create the show
      const showResult = await db.execute(sql`
        INSERT INTO shows (
          headliner_artist_id, venue_id, name, slug, date, start_time, doors_time,
          status, view_count, vote_count, trending_score, is_featured, is_verified,
          min_price, max_price, created_at
        ) VALUES (
          ${dispatch.id},
          ${msg.id},
          ${showData.name},
          ${showData.slug},
          ${showData.date.toISOString()},
          '20:00:00',
          '19:00:00',
          ${showData.status},
          ${Math.floor(Math.random() * 1000)},
          0,
          ${showData.status === 'upcoming' ? 85 : 60},
          false,
          true,
          75,
          250,
          NOW()
        )
        RETURNING id, name
      `);

      const show = showResult.rows[0];

      // Create show_artists relationship
      await db.execute(sql`
        INSERT INTO show_artists (show_id, artist_id, order_index, set_length, is_headliner)
        VALUES (${show.id}, ${dispatch.id}, 0, 90, true)
      `);

      // Create songs for Dispatch if they don't exist
      const dispatchSongs = [
        'The General',
        'Bang Bang',
        'Elias',
        'Bats in the Belfry',
        'Out Loud',
        'Flying Horses',
        'Open Up',
        'Circles Around the Sun',
        'Two Coins',
        'Skin the Rabbit',
        'Mission',
        'Drive',
        'Carry You',
        'Only the Wild Ones',
        'Midnight Lorry',
        'Passerby',
      ];
      for (let i = 0; i < dispatchSongs.length; i++) {
        const songTitle = dispatchSongs[i];

        // Check if song exists
        const existingSong = await db.execute(sql`
          SELECT id FROM songs 
          WHERE title = ${songTitle} AND artist = ${dispatch.name}
        `);

        if (!existingSong.rows.length) {
          await db.execute(sql`
            INSERT INTO songs (
              title, artist, album, duration_ms, popularity, 
              is_playable, created_at, artist_id
            ) VALUES (
              ${songTitle},
              ${dispatch.name},
              ${i < 8 ? 'Bang Bang' : 'America, Location 12'},
              ${180000 + Math.floor(Math.random() * 120000)},
              ${70 + Math.floor(Math.random() * 30)},
              true,
              NOW(),
              ${dispatch.id}
            )
          `);
        }
      }

      // Create a setlist for the show
      const setlistResult = await db.execute(sql`
        INSERT INTO setlists (
          show_id, artist_id, type, name, order_index, 
          total_votes, is_locked, created_at
        ) VALUES (
          ${show.id},
          ${dispatch.id},
          ${showData.status === 'upcoming' ? 'predicted' : 'actual'},
          'Main Set',
          0,
          0,
          false,
          NOW()
        )
        RETURNING id
      `);

      const setlist = setlistResult.rows[0];

      // Add songs to the setlist
      const songsForSetlist = await db.execute(sql`
        SELECT id FROM songs 
        WHERE artist = ${dispatch.name}
        ORDER BY popularity DESC
        LIMIT 12
      `);

      for (let i = 0; i < songsForSetlist.rows.length; i++) {
        const song = songsForSetlist.rows[i];
        await db.execute(sql`
          INSERT INTO setlist_songs (
            setlist_id, song_id, position, upvotes, downvotes, 
            net_votes, created_at
          ) VALUES (
            ${setlist.id},
            ${song.id},
            ${i + 1},
            ${Math.floor(Math.random() * 20)},
            ${Math.floor(Math.random() * 5)},
            ${Math.floor(Math.random() * 15)},
            NOW()
          )
        `);
      }
    }

    // Show summary
    const summary = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT s.id) as show_count,
        COUNT(DISTINCT sl.id) as setlist_count,
        COUNT(DISTINCT ss.id) as setlist_song_count
      FROM shows s
      LEFT JOIN setlists sl ON sl.show_id = s.id
      LEFT JOIN setlist_songs ss ON ss.setlist_id = sl.id
      WHERE s.headliner_artist_id = ${dispatch.id}
    `);

    const _counts = summary.rows[0];
  } catch (_error) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
