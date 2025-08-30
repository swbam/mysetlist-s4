import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Store trending shows in database
export const getTrendingShows = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("trendingShows")
      .order("desc")
      .take(limit);
  },
});

// Store trending artists in database
export const getTrendingArtists = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("trendingArtists")
      .order("desc")
      .take(limit);
  },
});

// Internal mutations for sync system to store trending data
export const storeTrendingShows = internalMutation({
  args: { 
    shows: v.array(v.object({
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
    }))
  },
  handler: async (ctx, args) => {
    // Clear existing trending shows
    const existingShows = await ctx.db.query("trendingShows").collect();
    for (const show of existingShows) {
      await ctx.db.delete(show._id);
    }

    // Store new trending shows
    for (const show of args.shows) {
      await ctx.db.insert("trendingShows", {
        ...show,
        lastUpdated: Date.now(),
      });
    }
  },
});

export const storeTrendingArtists = internalMutation({
  args: { 
    artists: v.array(v.object({
      ticketmasterId: v.string(),
      name: v.string(),
      genres: v.array(v.string()),
      images: v.array(v.string()),
      upcomingEvents: v.number(),
      url: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    // Clear existing trending artists
    const existingArtists = await ctx.db.query("trendingArtists").collect();
    for (const artist of existingArtists) {
      await ctx.db.delete(artist._id);
    }

    // Store new trending artists
    for (const artist of args.artists) {
      await ctx.db.insert("trendingArtists", {
        ...artist,
        lastUpdated: Date.now(),
      });
    }
  },
});
