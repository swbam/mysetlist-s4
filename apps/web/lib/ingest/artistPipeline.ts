import { upsertArtist } from "./upsertArtist";
// TODO: These imports are missing and need to be implemented
// import { resolveMusicBrainzMbid } from './resolveMbid';
// import { fetchAllSetlists } from './fetchSetlists';
// import { fetchShows } from './fetchShows';
// import { upsertShows } from './upsertShows';
// import { upsertSetlists } from './upsertSetlists';

export async function ingestArtistPipeline(tmId: string) {
  console.log(`Starting ingestion pipeline for Ticketmaster ID: ${tmId}`);

  try {
    // Step 1: Upsert artist from Ticketmaster data
    const artist = await upsertArtist(tmId);
    if (!artist) {
      throw new Error("Failed to upsert artist");
    }
    console.log(`Upserted artist: ${artist.name} (${artist.id})`);

    // TODO: Implement missing pipeline steps
    // Step 2: Try to resolve MusicBrainz ID for setlist.fm integration
    let mbid: string | null = artist.mbid || null;
    // if (!artist.mbid) {
    //   mbid = await resolveMusicBrainzMbid(artist.name);
    //   if (mbid) {
    //     console.log(`Resolved MusicBrainz ID: ${mbid}`);
    //     // Update artist with mbid
    //     await updateArtistMbid(artist.id, mbid);
    //   }
    // } else {
    //   mbid = artist.mbid;
    // }

    // Step 3: Fetch and import setlists if we have an MBID
    // if (mbid) {
    //   try {
    //     const setlists = await fetchAllSetlists(mbid);
    //     console.log(`Fetched ${setlists.length} setlists`);
    //
    //     if (setlists.length > 0) {
    //       await upsertSetlists(setlists, artist.id);
    //       console.log(`Upserted setlists for artist ${artist.name}`);
    //     }
    //   } catch (error) {
    //     console.error('Failed to fetch/upsert setlists:', error);
    //     // Continue with pipeline even if setlists fail
    //   }
    // }

    // Step 4: Fetch and import shows from Ticketmaster
    // try {
    //   const shows = await fetchShows(tmId);
    //   console.log(`Fetched ${shows.length} shows from Ticketmaster`);
    //
    //   if (shows.length > 0) {
    //     await upsertShows(shows, artist.id);
    //     console.log(`Upserted shows for artist ${artist.name}`);
    //   }
    // } catch (error) {
    //   console.error('Failed to fetch/upsert shows:', error);
    //   // Continue with pipeline even if shows fail
    // }

    // Step 5: Update last_synced timestamp
    // await updateArtistLastSynced(artist.id);

    console.log(`Completed ingestion pipeline for artist: ${artist.name}`);

    return {
      success: true,
      artistId: artist.id,
      artistName: artist.name,
      mbid,
    };
  } catch (error) {
    console.error(`Pipeline failed for Ticketmaster ID ${tmId}:`, error);
    throw error;
  }
}

// Helper function to update artist with MBID
// async function _updateArtistMbid(artistId: string, mbid: string) {
//   const { db } = await import('@repo/database');
//   const { artists } = await import('@repo/database');
//   const { eq } = await import('drizzle-orm');

//   await db
//     .update(artists)
//     .set({ mbid })
//     .where(eq(artists.id, artistId));
// }

// Helper function to update last_synced timestamp
// async function updateArtistLastSynced(artistId: string) {
//   const { db } = await import('@repo/database');
//   const { artists } = await import('@repo/database');
//   const { eq } = await import('drizzle-orm');

//   await db
//     .update(artists)
//     .set({ lastSynced: new Date() })
//     .where(eq(artists.id, artistId));
// }
