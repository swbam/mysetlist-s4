import { db } from "@repo/database";
import { artists, shows, venues, userActivityLog } from "@repo/database";
import { desc, isNull, lte, or, sql, eq, and, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Autonomous Sync System - Fully automated artist and show discovery
 * 
 * This endpoint autonomously discovers and syncs artists from multiple sources:
 * 1. Ticketmaster - For live upcoming shows
 * 2. Spotify - For popular artists
 * 3. Setlist.fm - For historical setlist data
 * 
 * Modes:
 * - discovery: Find new artists from Ticketmaster/Spotify
 * - sync: Sync existing artists
 * - full: Both discovery and sync
 */

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SETLISTFM_API_KEY = process.env.SETLISTFM_API_KEY;

interface SyncResult {
  success: boolean;
  mode: string;
  timestamp: string;
  discovery: {
    ticketmaster: { found: number; added: number; errors: number };
    spotify: { found: number; added: number; errors: number };
  };
  sync: {
    artists: { processed: number; updated: number; errors: number };
    shows: { processed: number; added: number; errors: number };
    venues: { processed: number; added: number; errors: number };
  };
  trending: {
    calculated: boolean;
    updated: number;
  };
  duration: string;
  errors: string[];
}

// Get Spotify access token
async function getSpotifyToken(): Promise<string | null> {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to get Spotify token:", error);
    return null;
  }
}

// Discover artists from Ticketmaster
async function discoverTicketmasterArtists(limit = 50): Promise<any[]> {
  if (!TICKETMASTER_API_KEY) {
    console.log("Ticketmaster API key not configured");
    return [];
  }

  try {
    // Get upcoming concerts in major markets
    const markets = ["Los Angeles", "New York", "Chicago", "San Francisco", "Seattle", "Austin", "Nashville"];
    const discoveredArtists: any[] = [];
    
    for (const market of markets.slice(0, 3)) { // Limit to prevent timeout
      const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
      url.searchParams.append("apikey", TICKETMASTER_API_KEY);
      url.searchParams.append("classificationName", "Music");
      url.searchParams.append("city", market);
      url.searchParams.append("size", "20");
      url.searchParams.append("sort", "relevance,desc");
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        console.error(`Ticketmaster API error for ${market}: ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data._embedded?.events) {
        for (const event of data._embedded.events) {
          // Extract artist from attractions
          if (event._embedded?.attractions) {
            for (const attraction of event._embedded.attractions) {
              if (attraction.classifications?.[0]?.segment?.name === "Music") {
                discoveredArtists.push({
                  ticketmasterId: attraction.id,
                  name: attraction.name,
                  imageUrl: attraction.images?.[0]?.url,
                  source: "ticketmaster",
                  market,
                });
              }
            }
          }
        }
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Deduplicate by ticketmasterId
    const uniqueArtists = Array.from(
      new Map(discoveredArtists.map(a => [a.ticketmasterId, a])).values()
    );
    
    return uniqueArtists.slice(0, limit);
  } catch (error) {
    console.error("Ticketmaster discovery error:", error);
    return [];
  }
}

// Discover popular artists from Spotify
async function discoverSpotifyArtists(token: string, limit = 50): Promise<any[]> {
  try {
    const discoveredArtists: any[] = [];
    
    // Get artists from different playlists and categories
    const playlists = [
      "37i9dQZEVXbMDoHDwVN2tF", // Global Top 50
      "37i9dQZEVXbLRQDuF5jeBp", // US Top 50
      "37i9dQZF1DXcBWIGoYBM5M", // Today's Top Hits
      "37i9dQZF1DX0XUsuxWHRQd", // RapCaviar
      "37i9dQZF1DX4JAvHpjipBk", // New Music Friday
    ];
    
    for (const playlistId of playlists.slice(0, 2)) { // Limit to prevent timeout
      const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error(`Spotify playlist error: ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.items) {
        for (const item of data.items) {
          if (item.track?.artists) {
            for (const artist of item.track.artists) {
              discoveredArtists.push({
                spotifyId: artist.id,
                name: artist.name,
                source: "spotify",
                playlist: playlistId,
              });
            }
          }
        }
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Deduplicate by spotifyId
    const uniqueArtists = Array.from(
      new Map(discoveredArtists.map(a => [a.spotifyId, a])).values()
    );
    
    // Get full artist details for unique artists
    const detailedArtists: any[] = [];
    for (const artist of uniqueArtists.slice(0, limit)) {
      try {
        const response = await fetch(`https://api.spotify.com/v1/artists/${artist.spotifyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const fullArtist = await response.json();
          detailedArtists.push({
            spotifyId: fullArtist.id,
            name: fullArtist.name,
            imageUrl: fullArtist.images?.[0]?.url,
            genres: fullArtist.genres,
            popularity: fullArtist.popularity,
            followers: fullArtist.followers?.total,
            source: "spotify",
          });
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching artist ${artist.spotifyId}:`, error);
      }
    }
    
    return detailedArtists;
  } catch (error) {
    console.error("Spotify discovery error:", error);
    return [];
  }
}

// Add discovered artists to database
async function addDiscoveredArtists(discoveredArtists: any[], source: string): Promise<{ added: number; errors: number }> {
  let added = 0;
  let errors = 0;
  
  for (const artist of discoveredArtists) {
    try {
      // Check if artist already exists
      const existing = await db
        .select()
        .from(artists)
        .where(
          or(
            artist.spotifyId ? eq(artists.spotifyId, artist.spotifyId) : sql`false`,
            artist.ticketmasterId ? eq(artists.ticketmasterId, artist.ticketmasterId) : sql`false`,
            eq(artists.name, artist.name)
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        // Create slug from name
        const slug = artist.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        
        // Insert new artist
        await db.insert(artists).values({
          name: artist.name,
          slug,
          spotifyId: artist.spotifyId || null,
          ticketmasterId: artist.ticketmasterId || null,
          imageUrl: artist.imageUrl || null,
          genres: artist.genres ? JSON.stringify(artist.genres) : null,
          popularity: artist.popularity || 0,
          followers: artist.followers || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        added++;
        
        // Log discovery
        await db.insert(userActivityLog).values({
          action: "artist_discovered",
          targetType: "artist",
          targetId: null,
          details: {
            source,
            artistName: artist.name,
            metadata: artist,
          },
        });
      }
    } catch (error) {
      console.error(`Error adding artist ${artist.name}:`, error);
      errors++;
    }
  }
  
  return { added, errors };
}

// Sync artist shows from Ticketmaster
async function syncArtistShows(artist: any): Promise<{ synced: number; errors: number }> {
  if (!TICKETMASTER_API_KEY || !artist.ticketmasterId) {
    return { synced: 0, errors: 0 };
  }
  
  try {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.append("apikey", TICKETMASTER_API_KEY);
    url.searchParams.append("attractionId", artist.ticketmasterId);
    url.searchParams.append("size", "50");
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    let synced = 0;
    let errors = 0;
    
    if (data._embedded?.events) {
      for (const event of data._embedded.events) {
        try {
          // Extract venue
          const venueData = event._embedded?.venues?.[0];
          let venueId: string | null = null;
          
          if (venueData) {
            // Check if venue exists by name and city (venues don't have ticketmasterId)
            const existingVenue = await db
              .select()
              .from(venues)
              .where(
                and(
                  eq(venues.name, venueData.name),
                  eq(venues.city, venueData.city?.name || 'Unknown')
                )
              )
              .limit(1);
            
            if (existingVenue.length === 0) {
              // Create venue
              const venueSlug = venueData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
              
              const newVenue = await db
                .insert(venues)
                .values({
                  name: venueData.name,
                  slug: venueSlug,
                  city: venueData.city?.name || 'Unknown',
                  state: venueData.state?.stateCode || null,
                  country: venueData.country?.countryCode || 'US',
                  timezone: venueData.timezone || 'America/New_York',
                  address: venueData.address?.line1 || null,
                  latitude: venueData.location?.latitude ? parseFloat(venueData.location.latitude) : null,
                  longitude: venueData.location?.longitude ? parseFloat(venueData.location.longitude) : null,
                  capacity: venueData.generalInfo?.generalRule ? 0 : null,
                })
                .returning();
              
              venueId = newVenue[0]?.id || null;
            } else {
              venueId = existingVenue[0]?.id || null;
            }
          }
          
          // Check if show exists
          const existingShow = await db
            .select()
            .from(shows)
            .where(eq(shows.ticketmasterId, event.id))
            .limit(1);
          
          if (existingShow.length === 0) {
            // Create show
            const showSlug = `${artist.slug}-${event.dates.start.localDate}-${venueData?.name || "venue"}`
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
            
            await db.insert(shows).values({
              name: event.name,
              slug: showSlug,
              ticketmasterId: event.id,
              headlinerArtistId: artist.id,
              venueId,
              date: event.dates.start.localDate,
              status: event.dates.status.code === "onsale" ? "upcoming" : "completed",
              ticketUrl: event.url || null,
              minPrice: event.priceRanges?.[0]?.min || null,
              maxPrice: event.priceRanges?.[0]?.max || null,
            });
            
            synced++;
          }
        } catch (error) {
          console.error(`Error syncing show ${event.name}:`, error);
          errors++;
        }
      }
    }
    
    return { synced, errors };
  } catch (error) {
    console.error(`Error syncing shows for ${artist.name}:`, error);
    return { synced: 0, errors: 1 };
  }
}

// Calculate trending scores
async function calculateTrendingScores(): Promise<{ updated: number }> {
  try {
    // Call the trending calculation endpoint
    const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const response = await fetch(`${url}/api/cron/calculate-trending`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CRON_SECRET}`,
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      return { updated: result.results?.artists?.updated || 0 };
    }
    
    return { updated: 0 };
  } catch (error) {
    console.error("Error calculating trending scores:", error);
    return { updated: 0 };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verify cron secret
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "full"; // discovery, sync, full
  const limit = parseInt(searchParams.get("limit") || "20");
  
  const result: SyncResult = {
    success: true,
    mode,
    timestamp: new Date().toISOString(),
    discovery: {
      ticketmaster: { found: 0, added: 0, errors: 0 },
      spotify: { found: 0, added: 0, errors: 0 },
    },
    sync: {
      artists: { processed: 0, updated: 0, errors: 0 },
      shows: { processed: 0, added: 0, errors: 0 },
      venues: { processed: 0, added: 0, errors: 0 },
    },
    trending: {
      calculated: false,
      updated: 0,
    },
    duration: "",
    errors: [],
  };
  
  try {
    // Log start
    await db.insert(userActivityLog).values({
      action: `autonomous-sync-${mode}`,
      targetType: "system",
      details: {
        mode,
        limit,
        startTime: result.timestamp,
      },
    });
    
    // Phase 1: Discovery (if enabled)
    if (mode === "discovery" || mode === "full") {
      // Discover from Ticketmaster
      const ticketmasterArtists = await discoverTicketmasterArtists(limit);
      result.discovery.ticketmaster.found = ticketmasterArtists.length;
      
      if (ticketmasterArtists.length > 0) {
        const tmResult = await addDiscoveredArtists(ticketmasterArtists, "ticketmaster");
        result.discovery.ticketmaster.added = tmResult.added;
        result.discovery.ticketmaster.errors = tmResult.errors;
      }
      
      // Discover from Spotify
      const spotifyToken = await getSpotifyToken();
      if (spotifyToken) {
        const spotifyArtists = await discoverSpotifyArtists(spotifyToken, limit);
        result.discovery.spotify.found = spotifyArtists.length;
        
        if (spotifyArtists.length > 0) {
          const spResult = await addDiscoveredArtists(spotifyArtists, "spotify");
          result.discovery.spotify.added = spResult.added;
          result.discovery.spotify.errors = spResult.errors;
        }
      } else {
        result.errors.push("Failed to get Spotify token");
      }
    }
    
    // Phase 2: Sync existing artists (if enabled)
    if (mode === "sync" || mode === "full") {
      // Get artists that need syncing
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const artistsToSync = await db
        .select()
        .from(artists)
        .where(
          or(
            isNull(artists.lastSyncedAt),
            lte(artists.lastSyncedAt, oneDayAgo)
          )
        )
        .orderBy(desc(artists.popularity))
        .limit(limit);
      
      result.sync.artists.processed = artistsToSync.length;
      
      // Sync each artist
      for (const artist of artistsToSync) {
        try {
          // Sync shows from Ticketmaster
          if (artist.ticketmasterId) {
            const showResult = await syncArtistShows(artist);
            result.sync.shows.added += showResult.synced;
            result.sync.shows.errors += showResult.errors;
          }
          
          // Update sync timestamp
          await db
            .update(artists)
            .set({
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artist.id));
          
          result.sync.artists.updated++;
          
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          result.sync.artists.errors++;
          result.errors.push(`Failed to sync artist ${artist.name}: ${error}`);
        }
      }
    }
    
    // Phase 3: Calculate trending scores
    const trendingResult = await calculateTrendingScores();
    result.trending.calculated = true;
    result.trending.updated = trendingResult.updated;
    
    // Calculate duration
    result.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
    
    // Log completion
    await db.insert(userActivityLog).values({
      action: `autonomous-sync-${mode}-complete`,
      targetType: "system",
      details: {
        mode,
        duration: result.duration,
        result,
      },
    });
    
    return NextResponse.json(result);
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
    result.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
    
    // Log error
    await db.insert(userActivityLog).values({
      action: `autonomous-sync-${mode}-error`,
      targetType: "system",
      details: {
        mode,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: result.duration,
      },
    });
    
    return NextResponse.json(result, { status: 500 });
  }
}

// Support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}