"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Ticketmaster API integration for artist search and full sync
export const searchArtists = action({
  args: { 
    query: v.string(),
    limit: v.optional(v.number())
  },
  returns: v.array(v.object({
    ticketmasterId: v.string(),
    name: v.string(),
    genres: v.array(v.string()),
    images: v.array(v.string()),
    url: v.optional(v.string()),
    upcomingEvents: v.number(),
  })),
  handler: async (ctx, args) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("Ticketmaster API key not configured");
    }

    const limit = args.limit || 20;
    const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(args.query)}&classificationName=music&size=${limit}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Ticketmaster API error: ${response.status}`);
      }

      const data = await response.json();
      const attractions = data._embedded?.attractions || [];

      return attractions.map((attraction: any) => ({
        ticketmasterId: String(attraction.id || ''),
        name: String(attraction.name || ''),
        genres: attraction.classifications?.[0]?.genre?.name ? [String(attraction.classifications[0].genre.name)] : [],
        images: (attraction.images?.map((img: any) => String(img.url)) || []),
        url: attraction.url ? String(attraction.url) : undefined,
        upcomingEvents: Number(attraction.upcomingEvents?._total || 0)
      }));
    } catch (error) {
      console.error("Ticketmaster search failed:", error);
      throw new Error("Failed to search artists");
    }
  },
});

export const startFullArtistSync = internalAction({
  args: {
    ticketmasterId: v.string(),
    artistName: v.string(),
    genres: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args): Promise<Id<"artists">> => {
    console.log(`Starting full sync for artist: ${args.artistName}`);

    // Phase 1: Create basic artist record
    const artistId: Id<"artists"> = await ctx.runMutation(internal.artists.createFromTicketmaster, {
      ticketmasterId: args.ticketmasterId,
      name: args.artistName,
      genres: args.genres || [],
      images: args.images || [],
    });

    // Phase 2: Sync shows and venues (blocking to populate UI quickly)
    await ctx.runAction(internal.ticketmaster.syncArtistShows, {
      artistId,
      ticketmasterId: args.ticketmasterId,
    });

    // Phase 3: Sync Spotify catalog (background)
    void ctx.runAction(internal.spotify.syncArtistCatalog, {
      artistId,
      artistName: args.artistName,
    });

    return artistId;
  },
});

export const syncArtistShows = internalAction({
  args: {
    artistId: v.id("artists"),
    ticketmasterId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) return;

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${args.ticketmasterId}&size=200&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const data = await response.json();
      const events = data._embedded?.events || [];

      for (const event of events) {
        // Create or get venue
        const venueId = await ctx.runMutation(internal.venues.createFromTicketmaster, {
          ticketmasterId: event._embedded?.venues?.[0]?.id,
          name: event._embedded?.venues?.[0]?.name || "Unknown Venue",
          city: event._embedded?.venues?.[0]?.city?.name || "",
          country: event._embedded?.venues?.[0]?.country?.name || "",
          address: event._embedded?.venues?.[0]?.address?.line1,
          capacity: event._embedded?.venues?.[0]?.capacity,
          lat: parseFloat(event._embedded?.venues?.[0]?.location?.latitude) || undefined,
          lng: parseFloat(event._embedded?.venues?.[0]?.location?.longitude) || undefined,
        });

        // Create show
        await ctx.runMutation(internal.shows.createFromTicketmaster, {
          artistId: args.artistId,
          venueId,
          ticketmasterId: event.id,
          date: event.dates?.start?.localDate || new Date().toISOString().split('T')[0],
          startTime: event.dates?.start?.localTime,
          status: event.dates?.status?.code === "onsale" ? "upcoming" : "upcoming",
          ticketUrl: event.url,
        });
        // gentle backoff to respect API
        await new Promise(r => setTimeout(r, 75));
      }
    } catch (error) {
      console.error("Failed to sync artist shows:", error);
    }
  },
});

// Public action to trigger full artist sync
export const triggerFullArtistSync = action({
  args: {
    ticketmasterId: v.string(),
    artistName: v.string(),
    genres: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args): Promise<Id<"artists">> => {
    return await ctx.runAction(internal.ticketmaster.startFullArtistSync, {
      ticketmasterId: args.ticketmasterId,
      artistName: args.artistName,
      genres: args.genres,
      images: args.images
    });
  },
});

// Get trending shows from Ticketmaster API
export const getTrendingShows = action({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    ticketmasterId: v.string(),
    artistTicketmasterId: v.optional(v.string()),
    artistName: v.string(),
    venueName: v.string(),
    venueCity: v.string(),
    venueCountry: v.string(),
    date: v.string(),
    startTime: v.optional(v.string()),
    artistImage: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    status: v.string(),
  })),
  handler: async (ctx, args) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("Ticketmaster API key not configured");
    }

    const limit = args.limit || 20;
    
    // Get popular upcoming music events
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=${limit}&sort=relevance,desc&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Ticketmaster API error: ${response.status}`);
      }

      const data = await response.json();
      const events = data._embedded?.events || [];

      return events.map((event: any) => ({
        ticketmasterId: String(event.id || ''),
        artistTicketmasterId: event._embedded?.attractions?.[0]?.id ? String(event._embedded.attractions[0].id) : undefined,
        artistName: String(event._embedded?.attractions?.[0]?.name || 'Unknown Artist'),
        venueName: String(event._embedded?.venues?.[0]?.name || 'Unknown Venue'),
        venueCity: String(event._embedded?.venues?.[0]?.city?.name || ''),
        venueCountry: String(event._embedded?.venues?.[0]?.country?.name || ''),
        date: String(event.dates?.start?.localDate || ''),
        startTime: event.dates?.start?.localTime ? String(event.dates.start.localTime) : undefined,
        artistImage: event._embedded?.attractions?.[0]?.images?.[0]?.url ? String(event._embedded.attractions[0].images[0].url) : undefined,
        ticketUrl: event.url ? String(event.url) : undefined,
        priceRange: event.priceRanges?.[0] ? `$${event.priceRanges[0].min}-${event.priceRanges[0].max}` : undefined,
        status: String(event.dates?.status?.code || 'onsale'),
      }));
    } catch (error) {
      console.error("Failed to fetch trending shows:", error);
      return [];
    }
  },
});

// Get trending artists from Ticketmaster API
export const getTrendingArtists = action({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    ticketmasterId: v.string(),
    name: v.string(),
    genres: v.array(v.string()),
    images: v.array(v.string()),
    upcomingEvents: v.number(),
    url: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("Ticketmaster API key not configured");
    }

    const limit = args.limit || 20;
    
    // Get popular music artists/attractions
    const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?classificationName=music&size=${limit}&sort=relevance,desc&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Ticketmaster API error: ${response.status}`);
      }

      const data = await response.json();
      const attractions = data._embedded?.attractions || [];

      return attractions.map((attraction: any) => ({
        ticketmasterId: String(attraction.id || ''),
        name: String(attraction.name || ''),
        genres: attraction.classifications?.[0]?.genre?.name ? [String(attraction.classifications[0].genre.name)] : [],
        images: (attraction.images?.map((img: any) => String(img.url)) || []),
        upcomingEvents: Number(attraction.upcomingEvents?._total || 0),
        url: attraction.url ? String(attraction.url) : undefined,
      }));
    } catch (error) {
      console.error("Failed to fetch trending artists:", error);
      return [];
    }
  },
});

// ADVANCED VENUE SEARCH: Zip code + radius search from Ticketmaster
export const searchVenuesByLocation = action({
  args: {
    zipCode: v.string(),
    radiusMiles: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    ticketmasterId: v.string(),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    capacity: v.optional(v.number()),
    upcomingEvents: v.number(),
    distance: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("Ticketmaster API key not configured");
    }

    const limit = args.limit || 50;
    const radius = args.radiusMiles || 40;
    
    // Ticketmaster venue search with geolocation
    const url = `https://app.ticketmaster.com/discovery/v2/venues.json?postalCode=${encodeURIComponent(args.zipCode)}&radius=${radius}&unit=miles&size=${limit}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Ticketmaster API error: ${response.status}`);
      }

      const data = await response.json();
      const venues = data._embedded?.venues || [];

      return venues.map((venue: any) => ({
        ticketmasterId: String(venue.id || ''),
        name: String(venue.name || ''),
        address: venue.address?.line1 ? String(venue.address.line1) : undefined,
        city: String(venue.city?.name || ''),
        state: venue.state?.stateCode ? String(venue.state.stateCode) : undefined,
        country: String(venue.country?.name || ''),
        lat: venue.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
        lng: venue.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
        capacity: venue.capacity ? Number(venue.capacity) : undefined,
        upcomingEvents: Number(venue.upcomingEvents?._total || 0),
        distance: venue.distance ? parseFloat(venue.distance) : undefined,
      }));
    } catch (error) {
      console.error("Failed to search venues by location:", error);
      return [];
    }
  },
});

// AUTONOMOUS VENUE ECOSYSTEM IMPORT: Venue → Shows → Artists → Complete Catalogs
export const triggerVenueEcosystemSync = action({
  args: {
    ticketmasterId: v.string(),
    venueName: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    address: v.optional(v.string()),
    capacity: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  returns: v.object({
    venueId: v.id("venues"),
    jobId: v.id("syncJobs"),
  }),
  handler: async (ctx, args) => {
    console.log(`🏛️ Starting venue ecosystem sync for: ${args.venueName}`);

    // Phase 1: Create or get venue immediately
    const venueId = await ctx.runMutation(internal.venues.createFromTicketmaster, {
      ticketmasterId: args.ticketmasterId,
      name: args.venueName,
      city: args.city,
      state: args.state,
      country: args.country,
      address: args.address,
      capacity: args.capacity,
      lat: args.lat,
      lng: args.lng,
    });

    // Phase 2: Create venue ecosystem sync job
    const jobId = await ctx.runMutation(internal.syncJobs.createVenueEcosystemJob, {
      venueId,
      ticketmasterId: args.ticketmasterId,
      priority: 8, // High priority for user-initiated sync
    });

    // Phase 3: Schedule immediate execution
    await ctx.scheduler.runAfter(0, internal.syncJobs.processVenueEcosystemSync, {
      jobId,
    });

    return { venueId, jobId };
  },
});
