import { Job } from "bullmq";
import { SetlistFmClient } from "@repo/external-apis";
import { db, artists, shows, setlists, setlistSongs, songs } from "@repo/database";
import { eq, sql, and, desc } from "drizzle-orm";
import { updateImportStatus } from "../../import-status";
import { RedisCache } from "../redis-config";

let _cache: RedisCache | null = null;
function getCache() {
  if (!_cache) _cache = new RedisCache();
  return _cache;
}

export interface SetlistSyncJobData {
  artistId: string;
  setlistfmMbid?: string;
  syncType: 'recent' | 'historical' | 'show-specific' | 'full';
  showId?: string;
  parentJobId?: string;
  options?: {
    maxSetlists?: number;
    includePast?: boolean;
    startDate?: string;
    endDate?: string;
  };
}

export async function processSetlistSync(job: Job<SetlistSyncJobData>) {
  const { artistId, setlistfmMbid, syncType, showId, parentJobId, options } = job.data;
  
  try {
    await job.log(`Starting setlist ${syncType} sync for artist ${artistId}`);
    await job.updateProgress(10);
    
    const setlistfm = new SetlistFmClient({
      apiKey: process.env.SETLISTFM_API_KEY || "",
    });
    
    switch (syncType) {
      case 'recent':
        return await syncRecentSetlists(setlistfm, artistId, setlistfmMbid, job, options);
      
      case 'historical':
        return await syncHistoricalSetlists(setlistfm, artistId, setlistfmMbid, job, options);
      
      case 'show-specific':
        return await syncShowSetlist(setlistfm, artistId, showId!, job);
      
      case 'full':
        return await syncFullSetlists(setlistfm, artistId, setlistfmMbid, job, options, parentJobId);
      
      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }
    
  } catch (error) {
    console.error(`Setlist sync failed for ${artistId}:`, error);
    
    if (parentJobId) {
      await updateImportStatus(parentJobId, {
        stage: "importing-setlists",
        progress: 60,
        message: `Setlist sync failed: ${(error as any).message}`,
        error: (error as any).message,
      });
    }
    
    throw error;
  }
}

async function syncRecentSetlists(
  setlistfm: SetlistFmClient,
  artistId: string,
  setlistfmMbid: string | undefined,
  job: Job,
  options?: any
) {
  if (!setlistfmMbid) {
    await job.log("No setlist.fm MBID available, skipping setlist sync");
    return {
      success: true,
      artistId,
      totalSetlists: 0,
      newSetlists: 0,
      updatedSetlists: 0,
    };
  }
  
  await job.updateProgress(20);
  
  // Get artist details
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }
  
  await job.updateProgress(30);
  
  const maxSetlists = options?.maxSetlists || 50;
  
  // Fetch recent setlists from setlist.fm
  const response = await setlistfm.searchSetlists({
    artistMbid: setlistfmMbid,
    p: 1, // Page 1
  });
  
  const setlistsData = response?.setlist?.slice(0, maxSetlists) || [];
  
  if (setlistsData.length === 0) {
    await job.log("No recent setlists found");
    return {
      success: true,
      artistId,
      totalSetlists: 0,
      newSetlists: 0,
      updatedSetlists: 0,
    };
  }
  
  await job.updateProgress(50);
  
  let newSetlists = 0;
  let updatedSetlists = 0;
  
  // Process each setlist
  for (let i = 0; i < setlistsData.length; i++) {
    const setlistData = setlistsData[i];
    
    try {
      const result = await processSetlist(setlistData, artistId, job);
      if (result.isNew) {
        newSetlists++;
      } else {
        updatedSetlists++;
      }
      
      const progress = 50 + ((i + 1) / setlistsData.length) * 40;
      await job.updateProgress(progress);
      
      // Rate limiting for setlist.fm
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Failed to process setlist ${setlistData.id}:`, error);
      await job.log(`Failed to process setlist ${setlistData.id}: ${error}`);
      continue;
    }
  }
  
  await job.updateProgress(100);
  await job.log(`Recent setlists sync completed: ${newSetlists} new, ${updatedSetlists} updated`);
  
  return {
    success: true,
    artistId,
    totalSetlists: setlistsData.length,
    newSetlists,
    updatedSetlists,
  };
}

async function syncHistoricalSetlists(
  setlistfm: SetlistFmClient,
  artistId: string,
  setlistfmMbid: string | undefined,
  job: Job,
  options?: any
) {
  if (!setlistfmMbid) {
    throw new Error("Cannot sync historical setlists without setlist.fm MBID");
  }
  
  await job.updateProgress(10);
  
  const maxSetlists = options?.maxSetlists || 200;
  const pageSize = 20;
  const maxPages = Math.ceil(maxSetlists / pageSize);
  
  let allSetlists: any[] = [];
  let newSetlists = 0;
  let updatedSetlists = 0;
  
  // Fetch multiple pages of historical setlists
  for (let page = 1; page <= maxPages; page++) {
    await job.updateProgress(10 + (page / maxPages) * 30);
    
    const response = await setlistfm.searchSetlists({
      artistMbid: setlistfmMbid,
      p: page,
    });
    
    const pageSetlists = response?.setlist || [];
    
    if (pageSetlists.length === 0) {
      break; // No more setlists
    }
    
    allSetlists.push(...pageSetlists);
    
    // Process this page of setlists
    for (const setlistData of pageSetlists) {
      try {
        const result = await processSetlist(setlistData, artistId, job);
        if (result.isNew) {
          newSetlists++;
        } else {
          updatedSetlists++;
        }
      } catch (error) {
        console.error(`Failed to process setlist ${setlistData.id}:`, error);
        continue;
      }
    }
    
    // Rate limiting between pages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await job.updateProgress(100);
  await job.log(`Historical setlists sync completed: ${newSetlists} new, ${updatedSetlists} updated from ${allSetlists.length} total`);
  
  return {
    success: true,
    artistId,
    totalSetlists: allSetlists.length,
    newSetlists,
    updatedSetlists,
  };
}

async function syncShowSetlist(
  setlistfm: SetlistFmClient,
  artistId: string,
  showId: string,
  job: Job
) {
  await job.updateProgress(20);
  
  // Get the show details
  const [show] = await db
    .select()
    .from(shows)
    .where(eq(shows.id, showId))
    .limit(1);
  
  if (!show) {
    throw new Error(`Show not found: ${showId}`);
  }
  
  await job.updateProgress(40);
  
  // Try to find the setlist by date and venue
  const showDate = show.date.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Search for setlists on this date
  const response = await setlistfm.searchSetlists({
    artistMbid: (show as any).setlistfmMbid, // Assume show has artist's MBID
    date: showDate,
  });
  
  const setlistsData = response?.setlist || [];
  
  if (setlistsData.length === 0) {
    await job.log(`No setlist found for show on ${showDate}`);
    return {
      success: true,
      artistId,
      showId,
      setlistFound: false,
    };
  }
  
  await job.updateProgress(60);
  
  // Use the first setlist (most relevant)
  const setlistData = setlistsData[0];
  
  const result = await processSetlist(setlistData, artistId, job, showId);
  
  await job.updateProgress(100);
  await job.log(`Show setlist sync completed for ${showDate}`);
  
  return {
    success: true,
    artistId,
    showId,
    setlistFound: true,
    setlistId: result.setlistId,
    isNew: result.isNew,
  };
}

async function syncFullSetlists(
  setlistfm: SetlistFmClient,
  artistId: string,
  setlistfmMbid: string | undefined,
  job: Job,
  options?: any,
  parentJobId?: string
) {
  await job.log("Starting full setlist sync...");
  
  if (!setlistfmMbid) {
    await job.log("No setlist.fm MBID available, skipping full setlist sync");
    return {
      success: true,
      artistId,
      totalSetlists: 0,
      newSetlists: 0,
      updatedSetlists: 0,
    };
  }
  
  // Step 1: Sync recent setlists (70%)
  await job.updateProgress(10);
  const recentResult = await syncRecentSetlists(
    setlistfm, 
    artistId, 
    setlistfmMbid, 
    job, 
    { maxSetlists: 100 }
  );
  
  // Update parent job progress
  if (parentJobId) {
    await updateImportStatus(parentJobId, {
      stage: "importing-setlists",
      progress: 70,
      message: "Syncing recent setlists...",
    });
  }
  
  // Step 2: Sync historical setlists if needed (100%)
  await job.updateProgress(70);
  const historicalResult = await syncHistoricalSetlists(
    setlistfm,
    artistId,
    setlistfmMbid,
    job,
    { maxSetlists: options?.maxSetlists || 500 }
  );
  
  if (parentJobId) {
    await updateImportStatus(parentJobId, {
      stage: "importing-setlists",
      progress: 85,
      message: "Setlist sync completed",
    });
  }
  
  await job.updateProgress(100);
  await job.log("Full setlist sync completed!");
  
  return {
    success: true,
    artistId,
    totalSetlists: recentResult.totalSetlists + historicalResult.totalSetlists,
    newSetlists: recentResult.newSetlists + historicalResult.newSetlists,
    updatedSetlists: recentResult.updatedSetlists + historicalResult.updatedSetlists,
    recent: recentResult,
    historical: historicalResult,
  };
}

async function processSetlist(
  setlistData: any,
  artistId: string,
  job: Job,
  specificShowId?: string
): Promise<{ setlistId: string; isNew: boolean }> {
  const setlistId = setlistData.id;
  const eventDate = new Date(setlistData.eventDate);
  
  // Check if setlist already exists
  const existingSetlist = await db
    .select()
    .from(setlists)
    .where(eq(setlists.setlistfmId, setlistId))
    .limit(1);
  
  const isNew = existingSetlist.length === 0;
  
  // Find or create the show for this setlist
  let showId = specificShowId;
  
  if (!showId) {
    // Try to find existing show by date and artist
    const existingShow = await db
      .select()
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          eq(sql`DATE(${shows.date})`, sql`DATE(${eventDate})`)
        )
      )
      .limit(1);
    
    if (existingShow.length > 0) {
      showId = existingShow[0].id;
    } else {
      // Create a new show for this setlist
      const venueInfo = setlistData.venue;
      const newShow = {
        headlinerArtistId: artistId,
        name: `${setlistData.artist.name} at ${venueInfo.name}`,
        date: eventDate,
        venueName: venueInfo.name,
        venueCity: venueInfo.city.name,
        venueCountry: venueInfo.city.country.name,
        setlistfmId: setlistId,
        lastUpdated: new Date(),
      };
      
      const insertedShows = await db
        .insert(shows)
        .values(newShow as any)
        .returning();
      
      showId = insertedShows[0].id;
    }
  }
  
  // Upsert setlist
  const setlistRecord = {
    setlistfmId: setlistId,
    showId: showId!,
    artistId,
    eventDate,
    tourName: setlistData.tour?.name || null,
    rawData: JSON.stringify(setlistData),
    lastUpdated: new Date(),
  };
  
  let dbSetlistId: string;
  
  if (isNew) {
    const insertedSetlists = await db
      .insert(setlists)
      .values(setlistRecord as any)
      .returning();
    
    dbSetlistId = insertedSetlists[0].id;
  } else {
    await db
      .update(setlists)
      .set({
        ...setlistRecord,
        updatedAt: new Date(),
      } as any)
      .where(eq(setlists.setlistfmId, setlistId));
    
    dbSetlistId = existingSetlist[0].id;
  }
  
  // Process songs in the setlist
  if (setlistData.sets?.set) {
    await processSetlistSongs(setlistData.sets.set, dbSetlistId, artistId);
  }
  
  await job.log(`Processed setlist ${setlistId} (${isNew ? 'new' : 'updated'})`);
  
  return { setlistId: dbSetlistId, isNew };
}

async function processSetlistSongs(
  sets: any[],
  setlistId: string,
  artistId: string
) {
  let songOrder = 1;
  
  for (const set of sets) {
    if (!set.song) continue;
    
    for (const songData of set.song) {
      try {
        // Find or create the song
        let songId = await findOrCreateSong(songData.name, artistId);
        
        // Create setlist song entry
        await db
          .insert(setlistSongs)
          .values({
            setlistId,
            songId,
            order: songOrder++,
            encore: set.encore || false,
            tape: songData.tape || false,
            info: songData.info || null,
          } as any)
          .onConflictDoNothing(); // Prevent duplicates
        
      } catch (error) {
        console.error(`Failed to process song ${songData.name}:`, error);
        continue;
      }
    }
  }
}

async function findOrCreateSong(
  songName: string,
  artistId: string
): Promise<string> {
  // First try to find existing song
  const existingSong = await db
    .select()
    .from(songs)
    .where(
      and(
        eq(songs.name, songName),
        eq(songs.artistId, artistId)
      )
    )
    .limit(1);
  
  if (existingSong.length > 0) {
    return existingSong[0].id;
  }
  
  // Create new song
  const newSong = await db
    .insert(songs)
    .values({
      name: songName,
      artistId,
      source: 'setlist',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .returning();
  
  return newSong[0].id;
}