import type { SimpleJob } from "../types";
import { SetlistFmClient } from "@repo/external-apis";
import { db, artists, setlists, setlistSongs, songs } from "@repo/database";
import { eq, sql } from "drizzle-orm";
import { updateImportStatus } from "../../import-status";
import { RedisCache } from "../redis-config";

const cache = new RedisCache();

export interface SetlistSyncJobData {
  artistId: string;
  setlistFmMbid?: string;
  artistName?: string;
  maxSetlists?: number;
  parentJobId?: string;
}

export async function processSetlistSync(job: SimpleJob<SetlistSyncJobData>) {
  const { artistId, setlistFmMbid, artistName, maxSetlists = 50, parentJobId } = job.data;
  
  try {
    await job.log(`Starting setlist sync for artist ${artistId}`);
    await job.updateProgress(10);
    
    // Get artist details
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);
    
    if (!artist) {
      throw new Error(`Artist not found: ${artistId}`);
    }
    
    const searchName = artistName || artist.name;
    
    // Initialize Setlist.fm client
    const setlistfm = new SetlistFmClient({
      apiKey: process.env.SETLISTFM_API_KEY || "",
    });
    
    await job.updateProgress(20);
    
    // Search for setlists
    let setlistsData: any[] = [];
    
    if (setlistFmMbid) {
      // Search by MusicBrainz ID if available
      const response = await setlistfm.getArtistSetlists(setlistFmMbid, {
        p: 1,
      });
      setlistsData = response?.setlist || [];
    } else {
      // Search by artist name
      const response = await setlistfm.searchSetlists({
        artistName: searchName,
        p: 1,
      });
      setlistsData = response?.setlist || [];
    }
    
    if (setlistsData.length === 0) {
      await job.log("No setlists found for artist");
      return {
        success: true,
        artistId,
        setlistsCreated: 0,
        songsCreated: 0,
      };
    }
    
    // Limit setlists to process
    setlistsData = setlistsData.slice(0, maxSetlists);
    
    await job.updateProgress(40);
    
    let setlistsCreated = 0;
    let songsCreated = 0;
    
    // Process each setlist
    for (let i = 0; i < setlistsData.length; i++) {
      const setlistData = setlistsData[i];
      
      // Create setlist record
      const setlistId = await createSetlist(artistId, setlistData);
      if (setlistId) {
        setlistsCreated++;
        
        // Process songs in setlist
        const songCount = await processSongsInSetlist(setlistId, setlistData, artistId);
        songsCreated += songCount;
      }
      
      const progress = 40 + (i / setlistsData.length) * 50;
      await job.updateProgress(progress);
    }
    
    // Update artist with setlist sync info
    await db
      .update(artists)
      .set({
        setlistsSyncedAt: new Date(),
        totalSetlists: setlistsCreated,
      })
      .where(eq(artists.id, artistId));
    
    await job.updateProgress(100);
    await job.log(`Setlist sync completed: ${setlistsCreated} setlists, ${songsCreated} songs`);
    
    if (parentJobId) {
      await updateImportStatus(parentJobId, {
        stage: "creating-setlists",
        progress: 90,
        message: `Setlists synced: ${setlistsCreated} setlists found`,
      });
    }
    
    return {
      success: true,
      artistId,
      setlistsCreated,
      songsCreated,
    };
    
  } catch (error) {
    console.error(`Setlist sync failed for ${artistId}:`, error);
    throw error;
  }
}

async function createSetlist(artistId: string, setlistData: any): Promise<string | null> {
  try {
    const venue = setlistData.venue;
    const city = venue?.city;
    
    const setlistRecord = {
      artistId,
      setlistFmId: setlistData.id,
      eventDate: setlistData.eventDate ? new Date(setlistData.eventDate) : null,
      venueName: venue?.name || null,
      city: city?.name || null,
      state: city?.state || null,
      country: city?.country?.name || null,
      tour: setlistData.tour?.name || null,
      rawData: JSON.stringify(setlistData),
    };
    
    const [created] = await db
      .insert(setlists)
      .values(setlistRecord as any)
      .onConflictDoUpdate({
        target: setlists.setlistFmId,
        set: {
          ...setlistRecord,
          updatedAt: new Date(),
        },
      })
      .returning({ id: setlists.id });
    
    return created?.id || null;
  } catch (error) {
    console.error("Failed to create setlist:", error);
    return null;
  }
}

async function processSongsInSetlist(setlistId: string, setlistData: any, artistId: string): Promise<number> {
  let songsProcessed = 0;
  
  try {
    const sets = setlistData.sets?.set || [];
    
    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      const set = sets[setIndex];
      const songList = set.song || [];
      
      for (let songIndex = 0; songIndex < songList.length; songIndex++) {
        const songData = songList[songIndex];
        
        if (!songData.name) continue;
        
        // Create or find song
        const songId = await findOrCreateSong(songData.name, artistId);
        
        if (songId) {
          // Create setlist song entry
          await db
            .insert(setlistSongs)
            .values({
              setlistId,
              songId,
              setNumber: setIndex + 1,
              songNumber: songIndex + 1,
              tape: songData.tape || false,
              info: songData.info || null,
            } as any)
            .onConflictDoNothing();
          
          songsProcessed++;
        }
      }
    }
    
    // Process encore if present
    if (setlistData.sets?.encore) {
      const encore = setlistData.sets.encore;
      const encoreSongs = encore.song || [];
      
      for (let songIndex = 0; songIndex < encoreSongs.length; songIndex++) {
        const songData = encoreSongs[songIndex];
        
        if (!songData.name) continue;
        
        const songId = await findOrCreateSong(songData.name, artistId);
        
        if (songId) {
          await db
            .insert(setlistSongs)
            .values({
              setlistId,
              songId,
              setNumber: 99, // Encore set
              songNumber: songIndex + 1,
              tape: songData.tape || false,
              info: songData.info || null,
            } as any)
            .onConflictDoNothing();
          
          songsProcessed++;
        }
      }
    }
  } catch (error) {
    console.error("Failed to process songs in setlist:", error);
  }
  
  return songsProcessed;
}

async function findOrCreateSong(songName: string, artistId: string): Promise<string | null> {
  try {
    // First try to find existing song
    const existing = await db
      .select({ id: songs.id })
      .from(songs)
      .where(sql`${songs.title} ILIKE ${`%${songName}%`}`)
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0].id;
    }
    
    // Create new song if not found
    const [created] = await db
      .insert(songs)
      .values({
        title: songName,
        artistId,
        source: 'setlistfm',
        isLive: true,
      } as any)
      .returning({ id: songs.id });
    
    return created?.id || null;
  } catch (error) {
    console.error(`Failed to find or create song "${songName}":`, error);
    return null;
  }
}