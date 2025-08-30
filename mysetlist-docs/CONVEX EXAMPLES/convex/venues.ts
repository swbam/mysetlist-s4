import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("venues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("venues")
      .order("desc")
      .take(limit);
  },
});

export const search = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Simple text search for venues
    const venues = await ctx.db
      .query("venues")
      .take(100);
    
    return venues
      .filter(venue => 
        venue.name.toLowerCase().includes(args.query.toLowerCase()) ||
        venue.city.toLowerCase().includes(args.query.toLowerCase())
      )
      .slice(0, limit);
  },
});

export const getByLocation = query({
  args: { 
    city: v.string(),
    country: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("venues")
      .withIndex("by_location", (q) => q.eq("city", args.city).eq("country", args.country))
      .take(limit);
  },
});

export const getByTicketmasterIdInternal = internalQuery({
  args: { ticketmasterId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("venues")
      .withIndex("by_ticketmaster_id", (q) => q.eq("ticketmasterId", args.ticketmasterId))
      .first();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("venues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createInternal = internalMutation({
  args: {
    name: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    address: v.optional(v.string()),
    capacity: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    ticketmasterId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("venues", args);
  },
});

export const createFromTicketmaster = internalMutation({
  args: {
    ticketmasterId: v.optional(v.string()),
    name: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    address: v.optional(v.string()),
    capacity: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.ticketmasterId) {
      // Use new index for performance
      const existing = await ctx.db
        .query("venues")
        .withIndex("by_ticketmaster_id", (q) => q.eq("ticketmasterId", args.ticketmasterId))
        .first();

      if (existing) {
        return existing._id;
      }
    }

    return await ctx.db.insert("venues", {
      name: args.name,
      city: args.city,
      state: args.state,
      country: args.country,
      address: args.address,
      capacity: args.capacity,
      lat: args.lat,
      lng: args.lng,
      ticketmasterId: args.ticketmasterId,
    });
  },
});
