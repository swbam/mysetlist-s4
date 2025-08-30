import { query, mutation, internalQuery, internalMutation, internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    type: v.union(
      v.literal("artist_basic"),
      v.literal("artist_shows"),
      v.literal("artist_catalog"),
      v.literal("trending_sync"),
      v.literal("active_sync"),
      v.literal("full_sync"),
      v.literal("venue_ecosystem_sync")
    ),
    entityId: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncJobs", {
      type: args.type,
      entityId: args.entityId,
      priority: args.priority || 1,
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
    });
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("syncJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();
  },
});

export const getPending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("syncJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(limit);
  },
});

export const startFullSync = mutation({
  args: {
    artistName: v.string(),
    ticketmasterId: v.optional(v.string()),
    artistData: v.optional(v.object({
      name: v.string(),
      images: v.optional(v.array(v.string())),
      genres: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    // Create a high-priority full sync job
    const jobId = await ctx.db.insert("syncJobs", {
      type: "full_sync",
      entityId: JSON.stringify({
        artistName: args.artistName,
        ticketmasterId: args.ticketmasterId,
        artistData: args.artistData,
      }),
      priority: 10, // High priority
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
    });

    // Schedule the sync to run immediately
    await ctx.scheduler.runAfter(0, internal.syncJobs.processFullSync, {
      jobId,
    });

    return jobId;
  },
});

export const processFullSync = internalAction({
  args: { jobId: v.id("syncJobs") },
  handler: async (ctx: ActionCtx, args) => {
    // Mark job as running and initialize progress
    await ctx.runMutation(internal.syncJobs.updateJobStatus, {
      jobId: args.jobId,
      status: "running",
      startedAt: Date.now(),
    });

    await ctx.runMutation(internal.syncJobs.updateJobProgress, {
      jobId: args.jobId,
      currentPhase: "Initializing",
      totalSteps: 4,
      completedSteps: 0,
      currentStep: "Preparing sync job",
      progressPercentage: 0,
    });

    try {
      const job = await ctx.runQuery(internal.syncJobs.getJobById, {
        jobId: args.jobId,
      });

      if (!job || !job.entityId) {
        throw new Error("Job not found or missing entity data");
      }

      const entityData = JSON.parse(job.entityId);
      
      // Step 1: Create or get artist
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Artist Setup",
        completedSteps: 1,
        currentStep: "Creating or retrieving artist profile",
        progressPercentage: 25,
      });

      const artistSlug = entityData.artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      let artist = await ctx.runQuery(internal.artists.getBySlugInternal, { slug: artistSlug });
      
      if (!artist) {
        const artistId = await ctx.runMutation(internal.artists.createInternal, {
          name: entityData.artistName,
          ticketmasterId: entityData.ticketmasterId,
          genres: entityData.artistData?.genres || [],
          images: entityData.artistData?.images || [],
        });
        artist = await ctx.runQuery(internal.artists.getByIdInternal, { id: artistId });
      }

      if (!artist) {
        throw new Error("Failed to create or retrieve artist");
      }

      // Step 2: Sync shows from Ticketmaster
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Show Import",
        completedSteps: 2,
        currentStep: "Fetching shows from Ticketmaster",
        progressPercentage: 50,
      });

      await syncArtistShows(ctx, artist, entityData.ticketmasterId, args.jobId);
      
      // Step 3: Sync catalog from Spotify
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Catalog Import",
        completedSteps: 3,
        currentStep: "Syncing music catalog from Spotify",
        progressPercentage: 75,
      });

      await syncArtistCatalog(ctx, artist, entityData.artistName, args.jobId);

      // Step 3b: Auto-generate setlists for upcoming shows with none
      const allShows = await ctx.runQuery(internal.shows.getAllByArtistInternal, { artistId: artist._id });
      for (const show of allShows) {
        const existingSetlists = await ctx.runQuery(api.setlists.getByShow, { showId: show._id });
        if ((existingSetlists || []).length === 0) {
          await ctx.runMutation(internal.setlists.autoGenerateSetlist, {
            showId: show._id,
            artistId: artist._id,
          });
          // brief backoff to avoid bursts
          await new Promise(r => setTimeout(r, 50));
        }
      }

      // Step 4: Finalization
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Finalizing",
        completedSteps: 4,
        currentStep: "Completing sync process",
        progressPercentage: 100,
      });

      // Mark job as completed
      await ctx.runMutation(internal.syncJobs.updateJobStatus, {
        jobId: args.jobId,
        status: "completed",
        completedAt: Date.now(),
      });

    } catch (error) {
      console.error("Full sync failed:", error);
      
      // Mark job as failed and potentially retry
      const job = await ctx.runQuery(internal.syncJobs.getJobById, {
        jobId: args.jobId,
      });
      
      if (job && job.retryCount < job.maxRetries) {
        await ctx.runMutation(internal.syncJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "pending",
          retryCount: job.retryCount + 1,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        
        // Schedule retry after delay
        await ctx.scheduler.runAfter(60000, internal.syncJobs.processFullSync, {
          jobId: args.jobId,
        });
      } else {
        await ctx.runMutation(internal.syncJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "failed",
          completedAt: Date.now(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  },
});

async function syncArtistShows(ctx: ActionCtx, artist: any, ticketmasterId?: string, _jobId?: string) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.log("Ticketmaster API key not configured");
    return;
  }

  try {
    // Search for shows by artist name or ID
    const searchQuery = ticketmasterId ? `attractionId=${ticketmasterId}` : `keyword=${encodeURIComponent(artist.name)}`;
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${searchQuery}&classificationName=music&size=50&sort=date,asc&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Ticketmaster events');
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    for (const event of events) {
      await syncEventFromTicketmaster(ctx, event, artist._id);
    }
  } catch (error) {
    console.error("Error syncing artist shows:", error);
  }
}

async function syncArtistCatalog(ctx: ActionCtx, artist: any, artistName: string, _jobId?: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log("Spotify credentials not configured");
    return;
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

    // Search for artist on Spotify
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const spotifyArtist = searchData.artists?.items?.[0];
      
      if (spotifyArtist) {
        // Update artist with Spotify data
        await ctx.runMutation(internal.artists.updateSpotifyData, {
          artistId: artist._id,
          spotifyId: spotifyArtist.id,
          popularity: spotifyArtist.popularity,
          followers: spotifyArtist.followers?.total,
          images: spotifyArtist.images?.map((img: any) => img.url) || [],
          genres: spotifyArtist.genres || [],
        });

        // Sync top tracks
        await syncArtistTopTracks(ctx, artist._id, spotifyArtist.id, tokenData.access_token);
      }
    }
  } catch (error) {
    console.error("Error syncing artist catalog:", error);
  }
}

async function syncArtistTopTracks(ctx: ActionCtx, artistId: string, spotifyId: string, accessToken: string) {
  try {
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (tracksResponse.ok) {
      const tracksData = await tracksResponse.json();
      const tracks = tracksData.tracks || [];

      for (const track of tracks.slice(0, 20)) {
        // Check if song already exists
        const existingSong = await ctx.runQuery(internal.songs.getBySpotifyIdInternal, { 
          spotifyId: track.id 
        });

        if (!existingSong) {
          const songId = await ctx.runMutation(internal.songs.createInternal, {
            title: track.name,
            album: track.album?.name,
            spotifyId: track.id,
            durationMs: track.duration_ms,
            popularity: track.popularity,
            trackNo: track.track_number,
            isLive: false,
            isRemix: false,
          });

          // Create artist-song relationship
          await ctx.runMutation(internal.artistSongs.create, {
            artistId: artistId as Id<"artists">,
            songId,
            isPrimaryArtist: true,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error syncing artist top tracks:", error);
  }
}

async function syncEventFromTicketmaster(ctx: ActionCtx, event: any, artistId: string) {
  try {
    // Extract venue info
    const venue = event._embedded?.venues?.[0];
    if (!venue) return;

    let venueRecord = await ctx.runQuery(internal.venues.getByTicketmasterIdInternal, { 
      ticketmasterId: venue.id 
    });

    if (!venueRecord) {
      const venueId = await ctx.runMutation(internal.venues.createInternal, {
        name: venue.name,
        city: venue.city?.name || "",
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
    if (!eventDate || !venueRecord) return;

    const existingShow = await ctx.runQuery(internal.shows.getByArtistAndDateInternal, {
      artistId: artistId as Id<"artists">,
      date: eventDate,
    });

    if (!existingShow) {
      const showId = await ctx.runMutation(internal.shows.createInternal, {
        artistId: artistId as Id<"artists">,
        venueId: venueRecord._id,
        date: eventDate,
        startTime: event.dates?.start?.localTime,
        status: "upcoming",
        ticketmasterId: event.id,
        ticketUrl: event.url,
      });

      // Auto-generate initial setlist for the new show
      await ctx.runMutation(internal.setlists.autoGenerateSetlist, {
        showId,
        artistId: artistId as Id<"artists">,
      });
    }
  } catch (error) {
    console.error("Error syncing Ticketmaster event:", error);
  }
}

// Internal functions
export const getJobById = internalQuery({
  args: { jobId: v.id("syncJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("syncJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    retryCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
    };
    
    if (args.startedAt !== undefined) updates.startedAt = args.startedAt;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;
    if (args.retryCount !== undefined) updates.retryCount = args.retryCount;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;
    
    await ctx.db.patch(args.jobId, updates);
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("syncJobs"),
    currentPhase: v.optional(v.string()),
    totalSteps: v.optional(v.number()),
    completedSteps: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    itemsProcessed: v.optional(v.number()),
    totalItems: v.optional(v.number()),
    progressPercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    
    if (args.currentPhase !== undefined) updates.currentPhase = args.currentPhase;
    if (args.totalSteps !== undefined) updates.totalSteps = args.totalSteps;
    if (args.completedSteps !== undefined) updates.completedSteps = args.completedSteps;
    if (args.currentStep !== undefined) updates.currentStep = args.currentStep;
    if (args.itemsProcessed !== undefined) updates.itemsProcessed = args.itemsProcessed;
    if (args.totalItems !== undefined) updates.totalItems = args.totalItems;
    if (args.progressPercentage !== undefined) updates.progressPercentage = args.progressPercentage;
    
    await ctx.db.patch(args.jobId, updates);
  },
});

export const getJobProgress = query({
  args: { jobId: v.id("syncJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    
    return {
      status: job.status,
      currentPhase: job.currentPhase,
      totalSteps: job.totalSteps,
      completedSteps: job.completedSteps,
      currentStep: job.currentStep,
      itemsProcessed: job.itemsProcessed,
      totalItems: job.totalItems,
      progressPercentage: job.progressPercentage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    };
  },
});

// Create venue ecosystem sync job
export const createVenueEcosystemJob = internalMutation({
  args: {
    venueId: v.id("venues"),
    ticketmasterId: v.string(),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncJobs", {
      type: "venue_ecosystem_sync",
      entityId: JSON.stringify({
        venueId: args.venueId,
        ticketmasterId: args.ticketmasterId,
      }),
      priority: args.priority || 5,
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
    });
  },
});

// ULTIMATE VENUE ECOSYSTEM SYNC: Import everything for a venue
export const processVenueEcosystemSync = internalAction({
  args: { jobId: v.id("syncJobs") },
  handler: async (ctx: ActionCtx, args) => {
    console.log(`🚀 Starting venue ecosystem sync job ${args.jobId}`);

    // Initialize job progress
    await ctx.runMutation(internal.syncJobs.updateJobStatus, {
      jobId: args.jobId,
      status: "running",
      startedAt: Date.now(),
    });

    await ctx.runMutation(internal.syncJobs.updateJobProgress, {
      jobId: args.jobId,
      currentPhase: "Venue Setup",
      totalSteps: 6,
      completedSteps: 0,
      currentStep: "Preparing venue ecosystem sync",
      progressPercentage: 0,
    });

    try {
      const job = await ctx.runQuery(internal.syncJobs.getJobById, {
        jobId: args.jobId,
      });

      if (!job?.entityId) {
        throw new Error("Job missing entity data");
      }

      const { venueId, ticketmasterId } = JSON.parse(job.entityId);

      // Step 1: Get venue events from Ticketmaster
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Event Discovery",
        completedSteps: 1,
        currentStep: "Fetching all events at this venue",
        progressPercentage: 17,
      });

      const events = await fetchVenueEvents(ctx, ticketmasterId);
      console.log(`📅 Found ${events.length} events at venue`);

      // Step 2: Extract unique artists from events
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Artist Discovery",
        completedSteps: 2,
        currentStep: "Identifying artists performing at venue",
        progressPercentage: 33,
      });

      const uniqueArtists = extractUniqueArtistsFromEvents(events);
      console.log(`🎤 Found ${uniqueArtists.length} unique artists`);

      // Step 3: Create/sync all artists with full catalogs
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Artist Import",
        completedSteps: 3,
        currentStep: "Importing artist profiles and catalogs",
        progressPercentage: 50,
      });

      const artistIds: string[] = [];
      for (let i = 0; i < uniqueArtists.length; i++) {
        const artistData = uniqueArtists[i];
        
        // Update sub-progress
        await ctx.runMutation(internal.syncJobs.updateJobProgress, {
          jobId: args.jobId,
          itemsProcessed: i + 1,
          totalItems: uniqueArtists.length,
          currentStep: `Importing ${artistData.name} (${i + 1}/${uniqueArtists.length})`,
        });

        const artistId = await syncArtistFromVenueData(ctx, artistData);
        if (artistId) {
          artistIds.push(artistId);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 4: Create all shows and link to artists
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Show Creation",
        completedSteps: 4,
        currentStep: "Creating show records and linking artists",
        progressPercentage: 67,
      });

      let showsCreated = 0;
      for (const event of events) {
        try {
          const showCreated = await createShowFromEvent(ctx, event, venueId);
          if (showCreated) showsCreated++;
        } catch (error) {
          console.error(`Failed to create show from event:`, error);
        }
      }

      console.log(`📊 Created ${showsCreated} shows`);

      // Step 5: Auto-generate setlists for all shows
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Setlist Generation",
        completedSteps: 5,
        currentStep: "Auto-generating setlists for shows",
        progressPercentage: 83,
      });

      const allVenueShows = await ctx.runQuery(internal.shows.getByVenueInternal, { venueId });
      let setlistsGenerated = 0;

      for (const show of allVenueShows) {
        try {
          const existingSetlists = await ctx.runQuery(api.setlists.getByShow, { showId: show._id });
          if ((existingSetlists || []).length === 0) {
            await ctx.runMutation(internal.setlists.autoGenerateSetlist, {
              showId: show._id,
              artistId: show.artistId,
            });
            setlistsGenerated++;
          }
        } catch (error) {
          console.error(`Failed to generate setlist for show ${show._id}:`, error);
        }
        
        // Brief backoff
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`🎵 Generated ${setlistsGenerated} setlists`);

      // Step 6: Finalization
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Completed",
        completedSteps: 6,
        currentStep: `Venue ecosystem sync complete: ${artistIds.length} artists, ${showsCreated} shows, ${setlistsGenerated} setlists`,
        progressPercentage: 100,
      });

      await ctx.runMutation(internal.syncJobs.updateJobStatus, {
        jobId: args.jobId,
        status: "completed",
        completedAt: Date.now(),
      });

      console.log(`✅ Venue ecosystem sync completed for ${venueId}: ${artistIds.length} artists, ${showsCreated} shows, ${setlistsGenerated} setlists`);

    } catch (error) {
      console.error("Venue ecosystem sync failed:", error);
      
      const job = await ctx.runQuery(internal.syncJobs.getJobById, {
        jobId: args.jobId,
      });
      
      if (job && job.retryCount < job.maxRetries) {
        await ctx.runMutation(internal.syncJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "pending",
          retryCount: job.retryCount + 1,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        
        // Schedule retry after delay
        await ctx.scheduler.runAfter(120000, internal.syncJobs.processVenueEcosystemSync, {
          jobId: args.jobId,
        });
      } else {
        await ctx.runMutation(internal.syncJobs.updateJobStatus, {
          jobId: args.jobId,
          status: "failed",
          completedAt: Date.now(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  },
});

// Helper functions for venue ecosystem sync
async function fetchVenueEvents(ctx: ActionCtx, venueTicketmasterId: string) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?venueId=${venueTicketmasterId}&classificationName=music&size=200&sort=date,asc&apikey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return data._embedded?.events || [];
  } catch (error) {
    console.error("Failed to fetch venue events:", error);
    return [];
  }
}

function extractUniqueArtistsFromEvents(events: any[]): Array<{
  ticketmasterId: string;
  name: string;
  genres: string[];
  images: string[];
}> {
  const artistMap = new Map<string, any>();
  
  for (const event of events) {
    const attractions = event._embedded?.attractions || [];
    for (const attraction of attractions) {
      if (attraction.id && attraction.name && !artistMap.has(attraction.id)) {
        artistMap.set(attraction.id, {
          ticketmasterId: attraction.id,
          name: attraction.name,
          genres: attraction.classifications?.[0]?.genre?.name ? [attraction.classifications[0].genre.name] : [],
          images: attraction.images?.map((img: any) => img.url) || [],
        });
      }
    }
  }
  
  return Array.from(artistMap.values());
}

async function syncArtistFromVenueData(ctx: ActionCtx, artistData: any): Promise<string | null> {
  try {
    // Check if artist already exists
    const existingArtist = await ctx.runQuery(api.artists.getByTicketmasterId, {
      ticketmasterId: artistData.ticketmasterId,
    });

    if (existingArtist) {
      return existingArtist._id;
    }

    // Create new artist and trigger full sync
    const artistId = await ctx.runAction(internal.ticketmaster.startFullArtistSync, {
      ticketmasterId: artistData.ticketmasterId,
      artistName: artistData.name,
      genres: artistData.genres,
      images: artistData.images,
    });

    return artistId;
  } catch (error) {
    console.error(`Failed to sync artist ${artistData.name}:`, error);
    return null;
  }
}

async function createShowFromEvent(ctx: ActionCtx, event: any, venueId: string): Promise<boolean> {
  try {
    const attraction = event._embedded?.attractions?.[0];
    if (!attraction) return false;

    // Get or create artist
    let artist = await ctx.runQuery(api.artists.getByTicketmasterId, {
      ticketmasterId: attraction.id,
    });

    if (!artist) {
      artist = await ctx.runQuery(api.artists.getByName, { name: attraction.name });
    }

    if (!artist) {
      // Create basic artist record (full sync will happen separately)
      const artistId = await ctx.runMutation(internal.artists.createFromTicketmaster, {
        ticketmasterId: attraction.id,
        name: attraction.name,
        genres: attraction.classifications?.[0]?.genre?.name ? [attraction.classifications[0].genre.name] : [],
        images: attraction.images?.map((img: any) => img.url) || [],
      });
      artist = await ctx.runQuery(internal.artists.getByIdInternal, { id: artistId });
    }

    if (!artist) return false;

    // Create show
    const eventDate = event.dates?.start?.localDate;
    if (!eventDate) return false;

    const existingShow = await ctx.runQuery(internal.shows.getByArtistAndDateInternal, {
      artistId: artist._id,
      date: eventDate,
    });

    if (!existingShow) {
      await ctx.runMutation(internal.shows.createFromTicketmaster, {
        artistId: artist._id,
        venueId: venueId as any,
        ticketmasterId: event.id,
        date: eventDate,
        startTime: event.dates?.start?.localTime,
        status: "upcoming",
        ticketUrl: event.url,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to create show from event:", error);
    return false;
  }
}
