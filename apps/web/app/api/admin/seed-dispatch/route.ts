import { db } from '@repo/database';
import {
  artists,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  venues,
} from '@repo/database';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // First check if Dispatch exists
    const dispatchArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, 'dispatch'))
      .limit(1);

    if (!dispatchArtist[0]) {
      return NextResponse.json(
        {
          error:
            'Dispatch not found. Please search for Dispatch in the app first.',
        },
        { status: 404 }
      );
    }

    const dispatch = dispatchArtist[0];

    // Get Madison Square Garden venue
    const msgVenue = await db
      .select()
      .from(venues)
      .where(eq(venues.slug, 'madison-square-garden'))
      .limit(1);

    if (!msgVenue[0]) {
      return NextResponse.json(
        { error: 'Madison Square Garden not found' },
        { status: 404 }
      );
    }

    const msg = msgVenue[0];

    // Create Dispatch songs if they don't exist
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

    const createdSongs = [];
    for (let i = 0; i < dispatchSongs.length; i++) {
      const songTitle = dispatchSongs[i];
      
      if (!songTitle) continue;

      // Check if song exists
      const existingSong = await db
        .select()
        .from(songs)
        .where(and(eq(songs.title, songTitle), eq(songs.artist, dispatch.name)))
        .limit(1);

      if (existingSong[0]) {
        createdSongs.push(existingSong[0]);
      } else {
        const newSong = await db
          .insert(songs)
          .values({
            title: songTitle,
            artist: dispatch.name,
            album: i < 8 ? 'Bang Bang' : 'America, Location 12',
            durationMs: 180000 + Math.floor(Math.random() * 120000),
            popularity: 70 + Math.floor(Math.random() * 30),
            isPlayable: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        createdSongs.push(newSong[0]);
      }
    }

    // Create upcoming and past shows for Dispatch
    const showsData = [
      {
        name: 'Dispatch at Madison Square Garden',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'upcoming' as const,
        slug: 'dispatch-madison-square-garden-2025',
      },
      {
        name: 'Dispatch Summer Tour - NYC',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        status: 'completed' as const,
        slug: 'dispatch-summer-tour-nyc-2024',
      },
      {
        name: 'Dispatch Acoustic Set',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'upcoming' as const,
        slug: 'dispatch-acoustic-set-2025',
      },
    ];

    const createdShows = [];
    for (const showData of showsData) {
      // Check if show already exists
      const existingShow = await db
        .select()
        .from(shows)
        .where(eq(shows.slug, showData.slug))
        .limit(1);

      if (existingShow[0]) {
        createdShows.push(existingShow[0]);
        continue;
      }

      // Create the show
      const newShow = await db
        .insert(shows)
        .values({
          headlinerArtistId: dispatch.id!,
          venueId: msg.id!,
          name: showData.name!,
          slug: showData.slug!,
          date:
            showData.date instanceof Date
              ? showData.date.toISOString().split('T')[0]!
              : showData.date!,
          startTime: '20:00:00',
          doorsTime: '19:00:00',
          status: showData.status!,
          viewCount: Math.floor(Math.random() * 1000),
          voteCount: 0,
          trendingScore: showData.status === 'upcoming' ? 85 : 60,
          isFeatured: false,
          isVerified: true,
          minPrice: 75,
          maxPrice: 250,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const show = newShow[0]!;
      createdShows.push(show);

      // Create show_artists relationship
      await db.insert(showArtists).values({
        showId: show.id,
        artistId: dispatch.id!,
        orderIndex: 0,
        setLength: 90,
        isHeadliner: true,
      });

      // Create a setlist for the show
      const newSetlist = await db
        .insert(setlists)
        .values({
          showId: show.id,
          artistId: dispatch.id,
          type: showData.status === 'upcoming' ? 'predicted' : 'actual',
          name: 'Main Set',
          orderIndex: 0,
          totalVotes: 0,
          isLocked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const setlist = newSetlist[0]!;

      // Add songs to the setlist (random selection)
      const shuffledSongs = [...createdSongs]
        .sort(() => Math.random() - 0.5)
        .slice(0, 12);

      for (let i = 0; i < shuffledSongs.length; i++) {
        const song = shuffledSongs[i]!;
        await db.insert(setlistSongs).values({
          setlistId: setlist.id,
          songId: song.id,
          position: i + 1,
          upvotes: Math.floor(Math.random() * 20),
          downvotes: Math.floor(Math.random() * 5),
          netVotes: Math.floor(Math.random() * 15),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Return summary
    return NextResponse.json({
      success: true,
      summary: {
        artist: dispatch.name,
        songsCount: createdSongs.length,
        showsCount: createdShows.length,
        message: 'Successfully added Dispatch shows and setlists!',
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to seed Dispatch data' },
      { status: 500 }
    );
  }
}
