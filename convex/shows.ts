import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Helper function to create SEO-friendly slugs
function createSEOSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Handle special characters and accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
    .substring(0, 100);       // Limit length for SEO
}

// Helper function to create descriptive show slugs
function createShowSlug(artistName: string, venueName: string, venueCity: string, date: string): string {
  // Format: artist-name-venue-name-city-yyyy-mm-dd
  const datePart = date; // Already in YYYY-MM-DD format
  return `${createSEOSlug(artistName)}-${createSEOSlug(venueName)}-${createSEOSlug(venueCity)}-${datePart}`;
}

export const getUpcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 15;
    const shows = await ctx.db
      .query("shows")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .order("asc")
      .take(limit);
    
    // Populate artist and venue data
    const enrichedShows = await Promise.all(
      shows.map(async (show) => {
        const [artist, venue] = await Promise.all([
          ctx.db.get(show.artistId),
          ctx.db.get(show.venueId),
        ]);
        return { ...show, artist, venue };
      })
    );
    
    return enrichedShows;
  },
});

export const getById = query({
  args: { id: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.id);
    if (!show) return null;
    
    const [artist, venue] = await Promise.all([
      ctx.db.get(show.artistId),
      ctx.db.get(show.venueId),
    ]);
    
    return { ...show, artist, venue };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const show = await ctx.db
      .query("shows")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    
    if (!show || !show.slug) return null;
    
    const [artist, venue] = await Promise.all([
      ctx.db.get(show.artistId),
      ctx.db.get(show.venueId),
    ]);
    
    return { ...show, artist, venue };
  },
});

export const getByArtist = query({
  args: { 
    artistId: v.id("artists"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const shows = await ctx.db
      .query("shows")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .order("desc")
      .take(limit);
    
    // Populate venue data
    const enrichedShows = await Promise.all(
      shows.map(async (show) => {
        const venue = await ctx.db.get(show.venueId);
        return { ...show, venue };
      })
    );
    
    return enrichedShows;
  },
});

// Internal functions
export const getAllByArtistInternal = internalQuery({
  args: { artistId: v.id("artists") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shows")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .collect();
  },
});

export const getUpcomingShows = internalQuery({
  args: {},
  handler: async (ctx) => {
    const shows = await ctx.db
      .query("shows")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .collect();

    // Populate artist and venue data
    return await Promise.all(
      shows.map(async (show) => {
        const [artist, venue] = await Promise.all([
          ctx.db.get(show.artistId),
          ctx.db.get(show.venueId),
        ]);
        return { ...show, artist, venue };
      })
    );
  },
});

export const markCompleted = internalMutation({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.showId, {
      status: "completed",
    });
  },
});

export const createFromTicketmaster = internalMutation({
  args: {
    artistId: v.id("artists"),
    venueId: v.id("venues"),
    ticketmasterId: v.string(),
    date: v.string(),
    startTime: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("completed"), v.literal("cancelled")),
    ticketUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shows")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    if (existing) return existing._id;

    // Get artist and venue data to generate slug
    const [artist, venue] = await Promise.all([
      ctx.db.get(args.artistId),
      ctx.db.get(args.venueId),
    ]);
    
    if (!artist || !venue) {
      throw new Error("Artist or venue not found");
    }
    
    // Generate SEO-friendly slug: artist-name-venue-name-city-date
    const slug = createShowSlug(artist.name, venue.name, venue.city, args.date);
    
    const showId = await ctx.db.insert("shows", {
      artistId: args.artistId,
      venueId: args.venueId,
      date: args.date,
      startTime: args.startTime,
      status: args.status,
      ticketmasterId: args.ticketmasterId,
      ticketUrl: args.ticketUrl,
      slug,
    });

    // Auto-generate initial setlist for the new show
    await ctx.runMutation(internal.setlists.autoGenerateSetlist, {
      showId,
      artistId: args.artistId,
    });

    return showId;
  },
});

export const createInternal = internalMutation({
  args: {
    artistId: v.id("artists"),
    venueId: v.id("venues"),
    date: v.string(),
    startTime: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("completed"), v.literal("cancelled")),
    ticketmasterId: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get artist and venue data to generate slug
    const [artist, venue] = await Promise.all([
      ctx.db.get(args.artistId),
      ctx.db.get(args.venueId),
    ]);
    
    if (!artist || !venue) {
      throw new Error("Artist or venue not found");
    }
    
    // Generate SEO-friendly slug: artist-name-venue-name-city-date
    const slug = createShowSlug(artist.name, venue.name, venue.city, args.date);
    
    return await ctx.db.insert("shows", {
      ...args,
      slug,
    });
  },
});

export const getByArtistAndDateInternal = internalQuery({
  args: {
    artistId: v.id("artists"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shows")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();
  },
});