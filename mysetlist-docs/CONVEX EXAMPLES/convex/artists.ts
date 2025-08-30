import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

export const getById = query({
  args: { id: v.id("artists") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artists")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Accepts either a SEO slug or a document id string and returns artist
export const getBySlugOrId = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    // Try by slug first
    const bySlug = await ctx.db
      .query("artists")
      .withIndex("by_slug", (q) => q.eq("slug", args.key))
      .unique();

    if (bySlug) return bySlug;

    // Fallback: try by id
    try {
      // Cast is safe at runtime; Convex ids are strings
      const possible = await ctx.db.get(args.key as any);
      if (possible) return possible as any;
    } catch {
      // ignore invalid id format
    }

    return null;
  },
});

export const getTrending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Get artists with high activity and recent engagement
    const artists = await ctx.db
      .query("artists")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    // Calculate trending score based on multiple factors
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const artistsWithScores = await Promise.all(
      artists.map(async (artist) => {
        let score = 0;
        
        // Base popularity score (0-100 from Spotify)
        score += (artist.popularity || 0) * 0.3;
        
        // Follower count (normalized, max 50 points)
        const followerScore = Math.min(50, Math.log10((artist.followers || 1) / 1000) * 10);
        score += Math.max(0, followerScore);
        
        // Recent activity boost - shows in the last week
        const recentShows = await ctx.db
          .query("shows")
          .withIndex("by_artist", (q) => q.eq("artistId", artist._id))
          .filter((q) => q.gt(q.field("lastSynced"), oneWeekAgo))
          .collect();
        score += recentShows.length * 15; // 15 points per recent show
        
        // Follower engagement - count follows in the last week
        const recentFollows = await ctx.db
          .query("userFollows")
          .withIndex("by_artist", (q) => q.eq("artistId", artist._id))
          .filter((q) => q.gt(q.field("createdAt"), oneWeekAgo))
          .collect();
        score += recentFollows.length * 10; // 10 points per recent follow
        
        // Vote activity - recent votes on their setlists
        const artistShows = await ctx.db
          .query("shows")
          .withIndex("by_artist", (q) => q.eq("artistId", artist._id))
          .collect();
          
        let recentVotes = 0;
        for (const show of artistShows) {
          const setlists = await ctx.db
            .query("setlists")
            .withIndex("by_show", (q) => q.eq("showId", show._id))
            .collect();
          
          for (const setlist of setlists) {
            const votes = await ctx.db
              .query("votes")
              .withIndex("by_setlist", (q) => q.eq("setlistId", setlist._id))
              .filter((q) => q.gt(q.field("createdAt"), oneWeekAgo))
              .collect();
            recentVotes += votes.length;
          }
        }
        score += recentVotes * 5; // 5 points per recent vote
        
        // Time decay - older synced artists get slight penalty
        const daysSinceSync = artist.lastSynced ? 
          Math.max(0, (now - artist.lastSynced) / (24 * 60 * 60 * 1000)) : 30;
        const timePenalty = Math.min(20, daysSinceSync * 0.5);
        score -= timePenalty;
        
        return { ...artist, trendingScore: Math.max(0, score) };
      })
    );
    
    // Sort by trending score and return top results
    return artistsWithScores
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, limit);
  },
});

export const search = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Simple text search - in production you'd use full-text search
    const artists = await ctx.db
      .query("artists")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(100);
    
    return artists
      .filter(artist => 
        artist.name.toLowerCase().includes(args.query.toLowerCase())
      )
      .slice(0, limit);
  },
});

// Get all artists with basic sorting and optional limit
export const getAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    // Return active artists ordered by trendingScore then followers/popularity
    const artists = await ctx.db
      .query("artists")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(500);

    return artists
      .sort((a, b) => {
        const scoreA = (b.trendingScore || 0) - (a.trendingScore || 0);
        if (scoreA !== 0) return scoreA;
        const followersDelta = (b.followers || 0) - (a.followers || 0);
        if (followersDelta !== 0) return followersDelta;
        return (b.popularity || 0) - (a.popularity || 0);
      })
      .slice(0, limit);
  },
});

export const isFollowing = query({
  args: { artistId: v.id("artists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const follow = await ctx.db
      .query("userFollows")
      .withIndex("by_user_and_artist", (q) => 
        q.eq("userId", userId).eq("artistId", args.artistId)
      )
      .first();

    return !!follow;
  },
});

export const followArtist = mutation({
  args: { artistId: v.id("artists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to follow artists");
    }

    const existingFollow = await ctx.db
      .query("userFollows")
      .withIndex("by_user_and_artist", (q) => 
        q.eq("userId", userId).eq("artistId", args.artistId)
      )
      .first();

    if (existingFollow) {
      await ctx.db.delete(existingFollow._id);
      return false; // unfollowed
    } else {
      await ctx.db.insert("userFollows", {
        userId,
        artistId: args.artistId,
        createdAt: Date.now(),
      });
      return true; // followed
    }
  },
});

export const createFromTicketmaster = internalMutation({
  args: {
    ticketmasterId: v.string(),
    name: v.string(),
    genres: v.array(v.string()),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if artist already exists
    const existing = await ctx.db
      .query("artists")
      .filter((q) => q.eq(q.field("ticketmasterId"), args.ticketmasterId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create slug from name
    const slug = args.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return await ctx.db.insert("artists", {
      slug,
      name: args.name,
      ticketmasterId: args.ticketmasterId,
      genres: args.genres,
      images: args.images,
      isActive: true,
      trendingScore: 0,
    });
  },
});

export const updateSpotifyData = internalMutation({
  args: {
    artistId: v.id("artists"),
    spotifyId: v.string(),
    followers: v.optional(v.number()),
    popularity: v.optional(v.number()),
    genres: v.array(v.string()),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.artistId, {
      spotifyId: args.spotifyId,
      followers: args.followers,
      popularity: args.popularity,
      genres: args.genres,
      images: args.images,
    });
  },
});

// Internal queries for sync operations
export const getBySlugInternal = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artists")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("artists") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createInternal = internalMutation({
  args: {
    name: v.string(),
    spotifyId: v.optional(v.string()),
    ticketmasterId: v.optional(v.string()),
    genres: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    popularity: v.optional(v.number()),
    followers: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Create SEO-friendly slug
    const slug = args.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
      .substring(0, 100);       // Limit length for SEO

    return await ctx.db.insert("artists", {
      slug,
      name: args.name,
      spotifyId: args.spotifyId,
      ticketmasterId: args.ticketmasterId,
      genres: args.genres || [],
      images: args.images || [],
      popularity: args.popularity,
      followers: args.followers,
      isActive: true,
      trendingScore: 1,
    });
  },
});

export const updateTrendingScore = internalMutation({
  args: {
    artistId: v.id("artists"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.artistId, {
      trendingScore: args.score,
    });
  },
});

export const getAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("artists").collect();
  },
});

export const resetInactiveTrendingScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const artists = await ctx.db.query("artists").collect();
    
    for (const artist of artists) {
      // Reset trending score to 0 for artists with low activity
      if ((artist.trendingScore || 0) < 5) {
        await ctx.db.patch(artist._id, {
          trendingScore: 0,
        });
      }
    }
  },
});

// Required functions from CONVEX.md specification
export const getStaleArtists = query({
  args: { olderThan: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artists")
      .filter((q) => q.lt(q.field("lastSynced"), args.olderThan))
      .collect();
  },
});

export const updateArtist = mutation({
  args: { 
    artistId: v.id("artists"),
    name: v.string(),
    image: v.optional(v.string()),
    genres: v.array(v.string()),
    popularity: v.number(),
    followers: v.number(),
    lastSynced: v.number(),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      name: args.name,
      genres: args.genres,
      popularity: args.popularity,
      followers: args.followers,
      lastSynced: args.lastSynced,
    };
    if (args.image) {
      updates.images = [args.image];
    }
    await ctx.db.patch(args.artistId, updates);
  },
});

// Additional required queries referenced in sync.ts
export const getBySpotifyId = query({
  args: { spotifyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artists")
      .withIndex("by_spotify_id", (q) => q.eq("spotifyId", args.spotifyId))
      .first();
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artists")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const getByTicketmasterId = query({
  args: { ticketmasterId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artists")
      .withIndex("by_ticketmaster_id", (q) => q.eq("ticketmasterId", args.ticketmasterId))
      .first();
  },
});

// Internal mutations for sync operations
export const create = internalMutation({
  args: {
    name: v.string(),
    spotifyId: v.string(),
    image: v.optional(v.string()),
    genres: v.array(v.string()),
    popularity: v.number(),
    followers: v.number(),
    lastSynced: v.number(),
  },
  handler: async (ctx, args) => {
    // Create SEO-friendly slug
    const slug = args.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
      .substring(0, 100);       // Limit length for SEO

    const images = args.image ? [args.image] : [];
    return await ctx.db.insert("artists", {
      slug,
      name: args.name,
      spotifyId: args.spotifyId,
      images,
      genres: args.genres,
      popularity: args.popularity,
      followers: args.followers,
      lastSynced: args.lastSynced,
      isActive: true,
      trendingScore: 1,
    });
  },
});
