"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const syncSpotifyArtists = action({
  args: {},
  returns: v.object({ synced: v.number() }),
  handler: async (ctx: ActionCtx) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log("Spotify credentials not configured");
      return { synced: 0 };
    }

    try {
      // Get Spotify access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Spotify token');
      }

      const tokenData = await tokenResponse.json();

      // Get artists that need updating (haven't been synced in 24 hours)
      const staleArtists: any[] = await ctx.runQuery(api.artists.getStaleArtists, {
        olderThan: Date.now() - 24 * 60 * 60 * 1000,
      });

      for (const artist of staleArtists) {
        try {
          // Get updated artist data from Spotify
          const spotifyResponse = await fetch(
            `https://api.spotify.com/v1/artists/${artist.spotifyId}`,
            {
              headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
            }
          );

          if (spotifyResponse.ok) {
            const spotifyData = await spotifyResponse.json();
            
            await ctx.runMutation(api.artists.updateArtist, {
              artistId: artist._id,
              name: spotifyData.name,
              image: spotifyData.images?.[0]?.url,
              genres: spotifyData.genres || [],
              popularity: spotifyData.popularity || 0,
              followers: spotifyData.followers?.total || 0,
              lastSynced: Date.now(),
            });

            // Sync complete catalog for this artist
            await syncArtistCompleteCatalog(ctx, artist._id, artist.spotifyId, tokenData.access_token);
          }
        } catch (error) {
          console.error(`Failed to sync artist ${artist.spotifyId}:`, error);
        }

        // Rate limiting: wait 1 second between artists to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Also discover new trending artists
      await discoverTrendingArtists(ctx, tokenData.access_token);

      return { synced: staleArtists.length };
    } catch (error) {
      console.error("Spotify sync error:", error);
      return { synced: 0 };
    }
  },
});

export const syncTicketmasterShows = action({
  args: {},
  returns: v.object({ synced: v.number() }),
  handler: async (ctx: ActionCtx) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.log("Ticketmaster API key not configured");
      return { synced: 0 };
    }

    try {
      let syncedCount = 0;
      
      // Get upcoming music events
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=200&sort=date,asc&apikey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Ticketmaster events');
      }

      const data = await response.json();
      const events = data._embedded?.events || [];

      for (const event of events) {
        const synced = await syncEventFromTicketmaster(ctx, event);
        if (synced) syncedCount++;

        // Rate limiting: wait 500ms between events to respect API limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return { synced: syncedCount };
    } catch (error) {
      console.error("Ticketmaster sync error:", error);
      return { synced: 0 };
    }
  },
});

export const syncSetlistFm = action({
  args: {},
  returns: v.object({ synced: v.number() }),
  handler: async (ctx: ActionCtx) => {
    const apiKey = process.env.SETLISTFM_API_KEY;
    if (!apiKey) {
      console.log("Setlist.fm API key not configured");
      return { synced: 0 };
    }

    try {
      let syncedCount = 0;

      // Get recent setlists from setlist.fm
      const response = await fetch(
        `https://api.setlist.fm/rest/1.0/search/setlists?p=1`,
        {
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json',
            'User-Agent': 'TheSet/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch setlists from setlist.fm');
      }

      const data = await response.json();
      const setlists = data.setlist || [];

      for (const setlist of setlists) {
        const synced = await syncSetlistFromSetlistFm(ctx, setlist);
        if (synced) syncedCount++;

        // Rate limiting: wait 200ms between setlists to respect API limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      return { synced: syncedCount };
    } catch (error) {
      console.error("Setlist.fm sync error:", error);
      return { synced: 0 };
    }
  },
});

// Helper functions
async function discoverTrendingArtists(ctx: ActionCtx, accessToken: string) {
  try {
    // Get trending playlists to find popular artists
    const playlistResponse = await fetch(
      'https://api.spotify.com/v1/browse/featured-playlists?limit=10',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!playlistResponse.ok) return;

    const playlistData = await playlistResponse.json();
    const playlists = playlistData.playlists?.items || [];

    // Process each playlist to extract trending artists
    for (const playlist of playlists.slice(0, 3)) {
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (tracksResponse.ok) {
        const tracksData = await tracksResponse.json();
        const tracks = tracksData.items || [];

        for (const item of tracks) {
          if (item.track?.artists) {
            for (const artist of item.track.artists) {
              await syncArtistFromSpotify(ctx, artist, accessToken);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error discovering trending artists:", error);
  }
}

async function syncArtistFromSpotify(ctx: ActionCtx, spotifyArtist: any, accessToken: string) {
  try {
    // Check if artist already exists by Spotify ID
    const existingArtist = await ctx.runQuery(api.artists.getBySpotifyId, { 
      spotifyId: spotifyArtist.id 
    });
    
    if (!existingArtist) {
      // Get full artist details
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists/${spotifyArtist.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (artistResponse.ok) {
        const fullArtist = await artistResponse.json();
        
        const artistId = await ctx.runMutation(internal.artists.create, {
          name: fullArtist.name,
          spotifyId: fullArtist.id,
          image: fullArtist.images?.[0]?.url,
          genres: fullArtist.genres || [],
          popularity: fullArtist.popularity || 0,
          followers: fullArtist.followers?.total || 0,
          lastSynced: Date.now(),
        });

        // Sync artist's complete studio catalog
        await syncArtistCompleteCatalog(ctx, artistId, fullArtist.id, accessToken);
      }
    }
  } catch (error) {
    console.error("Error syncing artist from Spotify:", error);
  }
}

async function syncArtistCompleteCatalog(ctx: ActionCtx, artistId: string, spotifyId: string, accessToken: string) {
  try {
    console.log(`Starting complete catalog sync for artist ${artistId}`);
    
    // Track imported songs to avoid duplicates within this sync
    const importedSongs = new Map<string, boolean>();
    let totalProcessed = 0;
    let totalImported = 0;
    let totalSkipped = 0;

    // Get ALL albums for the artist (studio albums and singles only)
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const albumsResponse = await fetch(
        `https://api.spotify.com/v1/artists/${spotifyId}/albums?include_groups=album,single&market=US&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!albumsResponse.ok) {
        console.error(`Failed to fetch albums for artist ${spotifyId}`);
        break;
      }

      const albumsData = await albumsResponse.json();
      const albums = albumsData.items || [];

      if (albums.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing ${albums.length} albums for artist ${artistId}`);

      // Process each album
      for (const album of albums) {
        // Skip if album type suggests non-studio content
        if (!isStudioAlbum(album.name, album.album_type)) {
          console.log(`Skipping non-studio album: ${album.name}`);
          continue;
        }

        // Get detailed album info including full track data
        const albumDetailResponse = await fetch(
          `https://api.spotify.com/v1/albums/${album.id}?market=US`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!albumDetailResponse.ok) {
          console.error(`Failed to fetch album details for ${album.id}`);
          continue;
        }

        const albumDetail = await albumDetailResponse.json();
        const tracks = albumDetail.tracks?.items || [];

        for (const track of tracks) {
          totalProcessed++;

          // COMPREHENSIVE STUDIO SONG FILTERING
          if (!isStudioSong(track.name, album.name)) {
            totalSkipped++;
            continue;
          }

          // DUPLICATE DETECTION - Multiple strategies
          const songFingerprint = createSongFingerprint(track.name, album.artists?.[0]?.name || "");
          
          // Skip if we already processed this song in this sync (by fingerprint)
          if (importedSongs.has(songFingerprint)) {
            totalSkipped++;
            console.log(`Skipping duplicate song by fingerprint: ${track.name}`);
            continue;
          }

          // Check if song already exists by Spotify ID (most reliable)
          const existingBySpotifyId = await ctx.runQuery(api.songs.getBySpotifyId, {
            spotifyId: track.id
          });

          if (existingBySpotifyId) {
            totalSkipped++;
            importedSongs.set(songFingerprint, true);
            continue;
          }

          // Additional duplicate check by song fingerprint (catches different Spotify IDs for same song)
          const potentialDuplicates = await ctx.runQuery(api.songs.getByArtist, {
            artistId: artistId as Id<"artists">,
            limit: 500 // Get more songs to check for duplicates properly
          });

          let isDuplicate = false;
          for (const existingSong of potentialDuplicates) {
            if (existingSong && areSongsEquivalent(track.name, existingSong.title)) {
              totalSkipped++;
              isDuplicate = true;
              console.log(`✅ Skipping duplicate song by title similarity: ${track.name} ≈ ${existingSong.title}`);
              break;
            }
          }

          if (isDuplicate) {
            importedSongs.set(songFingerprint, true);
            continue;
          }

          try {
            // Import the song (isStudio=true means it's a studio recording)
            const songId = await ctx.runMutation(internal.songs.create, {
              name: track.name,
              artist: album.artists?.[0]?.name || "",
              album: album.name,
              duration: track.duration_ms,
              spotifyId: track.id,
              popularity: track.popularity || 0,
              isStudio: true, // This ensures isLive=false in the song record
            });

            // Create artist-song relationship
            await ctx.runMutation(internal.artistSongs.create, {
              artistId: artistId as Id<"artists">,
              songId,
              isPrimaryArtist: true,
            });

            totalImported++;
            importedSongs.set(songFingerprint, true);
            
            console.log(`✅ Imported studio song: ${track.name} from ${album.name} (popularity: ${track.popularity || 0})`);
          } catch (error) {
            console.error(`❌ Failed to import song ${track.name}:`, error);
            totalSkipped++;
          }
        }

        // Rate limiting between tracks
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      offset += limit;
      if (albums.length < limit) {
        hasMore = false;
      }

      // Rate limiting between album batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Catalog sync completed for artist ${artistId}: ${totalImported} imported, ${totalSkipped} skipped, ${totalProcessed} total processed`);
  } catch (error) {
    console.error("Error syncing artist complete catalog:", error);
  }
}

// Helper function to determine if an album is likely to contain studio recordings
function isStudioAlbum(albumName: string, albumType: string): boolean {
  const albumNameLower = albumName.toLowerCase();
  
  // Always exclude live albums, compilations, etc.
  const excludedTypes = [
    'live', 'concert', 'unplugged', 'acoustic', 'greatest hits', 'best of',
    'collection', 'compilation', 'anthology', 'rarities', 'b-sides',
    'singles collection', 'remix', 'demo', 'bootleg', 'live from', 'live at',
    'mtv unplugged', 'bbc sessions', 'radio sessions'
  ];
  
  if (excludedTypes.some(type => albumNameLower.includes(type))) {
    return false;
  }
  
  // Prefer album and single types
  if (albumType === 'album' || albumType === 'single') {
    return true;
  }
  
  // Default: allow if not explicitly excluded
  return true;
}

// Create a fingerprint for duplicate detection
function createSongFingerprint(title: string, artist: string): string {
  // Normalize title and artist for comparison
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
  
  const normalizedArtist = artist
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return `${normalizedArtist}:${normalizedTitle}`;
}

// Check if two songs are equivalent (same song, possibly different versions)
function areSongsEquivalent(title1: string, title2: string): boolean {
  const normalize = (str: string) => str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Check if one is a substring of the other (handles "Song" vs "Song (Radio Edit)")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // But make sure it's not a coincidence (must be at least 70% similar)
    const similarity = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
    return similarity > 0.7;
  }
  
  // Calculate Levenshtein distance for fuzzy matching
  const distance = calculateLevenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  const similarity = 1 - distance / maxLength;
  
  // Consider songs equivalent if they're more than 85% similar
  return similarity > 0.85;
}

// Simple Levenshtein distance calculation
function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

function isStudioSong(trackTitle: string, albumTitle: string): boolean {
  const trackTitleLower = trackTitle.toLowerCase();
  const albumTitleLower = albumTitle.toLowerCase();
  
  // COMPREHENSIVE EXCLUSION FILTERS FOR STUDIO-ONLY SONGS - Enhanced to match spotify.ts
  
  // 1. Live recordings (most common exclusions)
  const liveKeywords = [
    'live', 'concert', 'tour', 'festival', 'session', 'performance',
    'recorded live', 'live at', 'live from', 'live in', 'live on',
    'mtv unplugged', 'bbc session', 'radio session', 'live session'
  ];
  
  if (liveKeywords.some(keyword =>
    trackTitleLower.includes(keyword) || albumTitleLower.includes(keyword)
  )) {
    return false;
  }
  
  // 2. Remixes and alternate versions - EXPANDED
  const remixKeywords = [
    'remix', 'mix)', 'radio edit', 'radio version', 'club mix', 'dance mix',
    'extended mix', 'dub mix', 'instrumental', 'karaoke', 'backing track',
    'club version', 'dance version', 'disco version', 'house mix',
    'techno mix', 'trance mix', 'dubstep', 'electronic version'
  ];
  
  if (remixKeywords.some(keyword => trackTitleLower.includes(keyword))) {
    return false;
  }
  
  // 3. Acoustic and stripped versions
  const acousticKeywords = [
    'acoustic', 'unplugged', 'stripped', 'piano version', 'solo version',
    'bare', 'intimate', 'coffeehouse', 'storytellers'
  ];
  
  if (acousticKeywords.some(keyword => trackTitleLower.includes(keyword))) {
    return false;
  }
  
  // 4. Demos, outtakes, and unreleased material - EXPANDED
  const demoKeywords = [
    'demo', 'rough', 'sketch', 'work tape', 'outtake', 'alternate',
    'alternative', 'take ', 'cut', 'unreleased', 'bootleg',
    'rarities', 'b-side'
  ];
  
  if (demoKeywords.some(keyword => trackTitleLower.includes(keyword))) {
    return false;
  }
  
  // 5. Bonus tracks and special editions
  const bonusKeywords = [
    'bonus', 'hidden track', 'secret track', 'extra', 'special edition',
    'collector', 'limited edition', 'anniversary'
  ];
  
  if (bonusKeywords.some(keyword => trackTitleLower.includes(keyword))) {
    return false;
  }
  
  // 6. Cover versions and collaborations (only exclude obvious covers)
  if (trackTitleLower.includes('cover of') ||
      trackTitleLower.includes('tribute to') ||
      trackTitleLower.includes('in the style of')) {
    return false;
  }
  
  // 7. Format indicators that suggest non-studio - EXPANDED
  const formatKeywords = [
    '(mono)', '(stereo)', '(live)', '(demo)', '(acoustic)', '(remix)',
    '(radio)', '(club)', '(extended)', '(instrumental)', '(karaoke)'
  ];
  
  if (formatKeywords.some(keyword => trackTitleLower.includes(keyword))) {
    return false;
  }
  
  // 8. Album type exclusions - COMPREHENSIVE
  const excludedAlbumTypes = [
    'live', 'concert', 'unplugged', 'greatest hits', 'best of', 'collection',
    'compilation', 'anthology', 'rarities', 'b-sides', 'singles collection',
    'remix', 'acoustic', 'demo', 'bootleg', 'live from', 'live at'
  ];
  
  if (excludedAlbumTypes.some(type => albumTitleLower.includes(type))) {
    return false;
  }
  
  // 9. Explicit studio indicators (these should be kept)
  const studioKeywords = [
    'studio version', 'original version', 'album cut', 'studio recording'
  ];
  
  if (studioKeywords.some(keyword => trackTitleLower.includes(keyword))) {
    return true;
  }
  
  // Default: if no exclusion criteria matched, assume it's a studio song
  return true;
}

async function syncEventFromTicketmaster(ctx: ActionCtx, event: any): Promise<boolean> {
  try {
    // Extract artist info
    const attraction = event._embedded?.attractions?.[0];
    if (!attraction || !attraction.name) return false;

    // Get or create artist
    let artist = await ctx.runQuery(api.artists.getByTicketmasterId, { 
      ticketmasterId: attraction.id 
    });
    
    if (!artist) {
      // Try to find by name
      artist = await ctx.runQuery(api.artists.getByName, { name: attraction.name });
      
      if (!artist) {
        // Create new artist
        const artistId = await ctx.runMutation(internal.artists.createInternal, {
          name: attraction.name,
          spotifyId: "", // Will be filled later by Spotify sync
          images: attraction.images?.[0]?.url ? [attraction.images[0].url] : [],
          genres: attraction.classifications?.[0]?.genre?.name ? [attraction.classifications[0].genre.name] : [],
          popularity: 0,
          followers: 0,
        });
        artist = await ctx.runQuery(api.artists.getById, { id: artistId });
      }
    }

    // Extract venue info
    const venue = event._embedded?.venues?.[0];
    if (!venue || !artist) return false;

    let venueRecord = await ctx.runQuery(internal.venues.getByTicketmasterIdInternal, { 
      ticketmasterId: venue.id 
    });

    if (!venueRecord) {
      const venueId = await ctx.runMutation(internal.venues.createInternal, {
        name: venue.name || venue.city?.name || "Unknown Venue",
        city: venue.city?.name || "",
        state: venue.state?.stateCode,
        country: venue.country?.name || "",
        address: venue.address?.line1,
        capacity: venue.capacity,
        lat: venue.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
        lng: venue.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
        ticketmasterId: venue.id,
      });
      venueRecord = await ctx.runQuery(internal.venues.getByIdInternal, { id: venueId });
    }

    // Create show if it doesn't exist
    const eventDate = event.dates?.start?.localDate;
    if (!eventDate || !venueRecord) return false;

    const existingShow = await ctx.runQuery(internal.shows.getByArtistAndDateInternal, {
      artistId: artist._id,
      date: eventDate,
    });

    if (!existingShow) {
      await ctx.runMutation(internal.shows.createInternal, {
        artistId: artist._id,
        venueId: venueRecord._id,
        date: eventDate,
        startTime: event.dates?.start?.localTime,
        status: "upcoming",
        ticketmasterId: event.id,
        ticketUrl: event.url,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error syncing Ticketmaster event:", error);
    return false;
  }
}

async function syncSetlistFromSetlistFm(ctx: ActionCtx, setlist: any): Promise<boolean> {
  try {
    // Find matching show by artist name and date
    const artistName = setlist.artist?.name;
    const rawEventDate = setlist.eventDate;
    
    if (!artistName || !rawEventDate) return false;

    // Normalize setlist.fm date (usually dd-MM-yyyy) to yyyy-MM-dd used by our DB
    const eventDate = (() => {
      const ddmmyyyy = String(rawEventDate);
      if (/^\d{2}-\d{2}-\d{4}$/.test(ddmmyyyy)) {
        const [dd, mm, yyyy] = ddmmyyyy.split("-");
        return `${yyyy}-${mm}-${dd}`;
      }
      return ddmmyyyy; // assume already normalized
    })();

    // Find artist
    const artist = await ctx.runQuery(api.artists.getByName, { name: artistName });
    if (!artist) return false;

    // Find show
    const show = await ctx.runQuery(internal.shows.getByArtistAndDateInternal, {
      artistId: artist._id,
      date: eventDate,
    });

    if (!show) return false;

    // Check if setlist already exists
    const existingSetlists = await ctx.runQuery(api.setlists.getByShow, { 
      showId: show._id 
    });

    // Parse songs from setlist
    const songs = [];
    let order = 1;

    if (setlist.sets?.set) {
      for (const set of setlist.sets.set) {
        if (set.song) {
          for (const song of set.song) {
            songs.push({
              name: song.name,
              artist: song.cover?.name || undefined,
              encore: set.encore || false,
              order: order++,
            });
          }
        }
      }
    }

    if (songs.length === 0) return false;

    // Format songs to match the expected interface
    const formattedSongs = songs.map((s: any) => ({
      title: s.name,
      album: undefined as string | undefined,
      duration: undefined as number | undefined,
      songId: undefined,
    }));

    if (existingSetlists && existingSetlists.length > 0) {
      // Update existing setlist
      await ctx.runMutation(internal.setlists.createOfficial, {
        showId: show._id,
        songs: formattedSongs,
        setlistfmId: setlist.id,
      });
      console.log(`✅ Updated official setlist for show ${show._id} with ${songs.length} songs`);
    } else {
      // Create new setlist
      await ctx.runMutation(internal.setlists.createOfficial, {
        showId: show._id,
        songs: formattedSongs,
        setlistfmId: setlist.id,
      });
      console.log(`✅ Created official setlist for show ${show._id} with ${songs.length} songs`);
    }

    return true;
  } catch (error) {
    console.error("Error syncing setlist from setlist.fm:", error);
    return false;
  }
}

// Sync trending data from Ticketmaster API
export const syncTrendingData = action({
  args: {},
  returns: v.object({ artistsSynced: v.number(), showsSynced: v.number() }),
  handler: async (ctx: ActionCtx) => {
    console.log("🔥 Starting trending data sync from Ticketmaster API");
    
    let artistsSynced = 0;
    let showsSynced = 0;

    try {
      // Get trending shows from Ticketmaster API
      const trendingShows = await ctx.runAction(api.ticketmaster.getTrendingShows, { limit: 50 });
      
      console.log(`📈 Found ${trendingShows.length} trending shows from Ticketmaster`);
      
      // Store trending shows in database for homepage to use
      await ctx.runMutation(internal.trending.storeTrendingShows, { shows: trendingShows });

      // Process each trending show and create full artist profiles
      for (const show of trendingShows) {
        try {
          // Check if artist exists, if not create with full sync
          const artist = await ctx.runQuery(api.artists.getByName, { name: show.artistName });
          
          if (!artist) {
            console.log(`✨ Creating new artist: ${show.artistName}`);
            
            // Trigger full artist sync which will create artist, sync shows, and import catalog
            await ctx.runAction(internal.ticketmaster.startFullArtistSync, {
              ticketmasterId: show.artistTicketmasterId || "",
              artistName: show.artistName,
              genres: [],
              images: show.artistImage ? [show.artistImage] : [],
            });
            
            artistsSynced++;
          }

          showsSynced++;
          
          // Rate limiting to respect API limits
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Failed to sync trending show for ${show.artistName}:`, error);
        }
      }

      // Get trending artists from Ticketmaster API
      const trendingArtists = await ctx.runAction(api.ticketmaster.getTrendingArtists, { limit: 30 });
      
      console.log(`🎤 Found ${trendingArtists.length} trending artists from Ticketmaster`);
      
      // Store trending artists in database for homepage to use
      await ctx.runMutation(internal.trending.storeTrendingArtists, { artists: trendingArtists });

      // Process trending artists
      for (const artistData of trendingArtists) {
        try {
          const existingArtist = await ctx.runQuery(api.artists.getByName, { name: artistData.name });
          
          if (!existingArtist) {
            console.log(`✨ Creating new trending artist: ${artistData.name}`);
            
            // Trigger full artist sync
            await ctx.runAction(internal.ticketmaster.startFullArtistSync, {
              ticketmasterId: artistData.ticketmasterId,
              artistName: artistData.name,
              genres: artistData.genres,
              images: artistData.images,
            });
            
            artistsSynced++;
          } else {
            // Update trending score for existing artist
            const newScore = (existingArtist.trendingScore || 0) + 5 + (artistData.upcomingEvents * 2);
            await ctx.runMutation(internal.artists.updateTrendingScore, {
              artistId: existingArtist._id,
              score: newScore,
            });
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`❌ Failed to sync trending artist ${artistData.name}:`, error);
        }
      }

      console.log(`🎉 Trending sync completed: ${artistsSynced} new artists, ${showsSynced} shows processed`);
      
      return { artistsSynced, showsSynced };
      
    } catch (error) {
      console.error("❌ Trending data sync failed:", error);
      return { artistsSynced, showsSynced };
    }
  },
});