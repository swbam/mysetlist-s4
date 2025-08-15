import { db } from "@repo/database";
import {
  artists,
  setlistSongs,
  setlists,
  shows,
  songs,
  venues,
} from "@repo/database";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function upsertSetlists(rawSetlists: any[], artistId: string) {
  const upsertedSetlists: any[] = [];

  for (const setlist of rawSetlists) {
    try {
      if (!setlist.id || !setlist.eventDate) {
        console.warn("Skipping setlist - missing required fields");
        continue;
      }

      // Check if setlist already exists
      const existingSetlist = await db
        .select()
        .from(setlists)
        .where(eq(setlists.externalId, setlist.id))
        .limit(1);

      if (existingSetlist.length > 0) {
        console.log(`Setlist ${setlist.id} already exists, skipping`);
        continue;
      }

      // Try to find matching show by date and venue
      let showId: string | null = null;

      if (setlist.venue) {
        // First try to find venue
        const venue = await findOrCreateVenueFromSetlistFm(setlist.venue);

        if (venue) {
          // Try to find show by artist, venue, and date
          const showDate = new Date(setlist.eventDate);
          const dateRangeStart = new Date(showDate);
          dateRangeStart.setDate(dateRangeStart.getDate() - 1);
          const dateRangeEnd = new Date(showDate);
          dateRangeEnd.setDate(dateRangeEnd.getDate() + 1);

          const matchingShow = await db
            .select()
            .from(shows)
            .where(
              and(
                eq(shows.headlinerArtistId, artistId),
                eq(shows.venueId, venue.id),
              ),
            )
            .limit(1);

          if (matchingShow.length > 0) {
            showId = matchingShow[0]?.id ?? null;
          }
        }
      }

      // Skip if we couldn't find a matching show
      if (!showId) {
        console.warn(
          `Could not find matching show for setlist ${setlist.id}, skipping`,
        );
        continue;
      }

      // Create setlist
      const newSetlist = {
        id: nanoid(),
        showId,
        artistId,
        type: "actual" as const,
        externalId: setlist.id,
        importedFrom: "setlist.fm",
        importedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(setlists).values(newSetlist);

      // Process and insert songs
      if (setlist.sets?.set && Array.isArray(setlist.sets.set)) {
        await processSetlistSongs(newSetlist.id, setlist.sets.set, artistId);
      }

      upsertedSetlists.push(newSetlist);
    } catch (error) {
      console.error(`Failed to upsert setlist ${setlist.id}:`, error);
      // Continue with other setlists
    }
  }

  console.log(
    `Upserted ${upsertedSetlists.length} setlists for artist ${artistId}`,
  );
  return upsertedSetlists;
}

async function findOrCreateVenueFromSetlistFm(sfVenue: any) {
  if (!sfVenue.id) return null;

  try {
    // Check if venue exists by name and city
    const existingVenue = await db
      .select()
      .from(venues)
      .where(
        and(
          eq(venues.name, sfVenue.name),
          eq(venues.city, sfVenue.city?.name || ""),
        ),
      )
      .limit(1);

    if (existingVenue.length > 0) {
      return existingVenue[0];
    }

    // Create new venue from setlist.fm data
    const slug = generateSlug(sfVenue.name);
    const newVenue = {
      id: nanoid(),
      name: sfVenue.name,
      slug,
      city: sfVenue.city?.name || "",
      state: sfVenue.city?.stateCode || null,
      country: sfVenue.city?.country?.code || "",
      timezone: "UTC", // Default timezone
      latitude: sfVenue.city?.coords?.lat
        ? Number.parseFloat(sfVenue.city.coords.lat)
        : null,
      longitude: sfVenue.city?.coords?.long
        ? Number.parseFloat(sfVenue.city.coords.long)
        : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(venues).values(newVenue);

    return newVenue;
  } catch (error) {
    console.error("Failed to find/create venue:", error);
    return null;
  }
}

async function processSetlistSongs(
  setlistId: string,
  sets: any[],
  artistId: string,
) {
  let position = 0;

  for (const set of sets) {
    if (set.song && Array.isArray(set.song)) {
      for (const songData of set.song) {
        try {
          // Find or create song
          const song = await findOrCreateSong(songData, artistId);

          if (song) {
            // Add to setlist_songs junction table
            const notes: any[] = [];
            if (set.encore === 1) notes.push("encore");
            if (songData.cover) notes.push("cover");
            if (songData.info) notes.push(songData.info);

            await db.insert(setlistSongs).values({
              setlistId,
              songId: song.id,
              position,
              notes: notes.length > 0 ? notes.join(", ") : null,
            });

            position++;
          }
        } catch (error) {
          console.error("Failed to process setlist song:", error);
          // Continue with other songs
        }
      }
    }
  }
}

async function findOrCreateSong(songData: any, artistId: string) {
  const songName = songData.name;
  if (!songName) return null;

  try {
    // Get artist name from artistId
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (artist.length === 0) return null;
    const artistName = artist[0]?.name;
    if (!artistName) return null;

    // Try to find existing song by name and artist
    const existingSong = await db
      .select()
      .from(songs)
      .where(and(eq(songs.name, songName), eq(songs.artist, artistName)))
      .limit(1);

    if (existingSong.length > 0) {
      return existingSong[0];
    }

    // Create new song
    const newSong = {
      id: nanoid(),
      name: songName,
      artist: artistName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(songs).values(newSong);

    return newSong;
  } catch (error) {
    console.error("Failed to find/create song:", error);
    return null;
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
