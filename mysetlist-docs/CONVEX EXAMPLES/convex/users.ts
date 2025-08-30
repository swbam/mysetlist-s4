import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// Get current user profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    return user;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    preferences: v.optional(v.object({
      emailNotifications: v.boolean(),
      favoriteGenres: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if username is already taken (if provided and different from current)
    if (args.username && args.username !== user.username) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.username!))
        .first();
      
      if (existingUser) {
        throw new Error("Username already taken");
      }
    }

    const updateData: any = {};
    if (args.username !== undefined) {
      updateData.username = args.username;
    }
    if (args.bio !== undefined) {
      updateData.bio = args.bio;
    }
    if (args.preferences !== undefined) {
      updateData.preferences = args.preferences;
    }

    await ctx.db.patch(user._id, updateData);
    
    return await ctx.db.get(user._id);
  },
});

// Get user statistics
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Count user's votes
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Count user's follows
    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Count user's setlists
    const setlists = await ctx.db
      .query("setlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      totalVotes: votes.length,
      totalFollows: follows.length,
      totalSetlists: setlists.length,
      joinedAt: user._creationTime,
    };
  },
});

// Get user's followed artists
export const getUserFollows = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Populate artist data
    const followsWithArtists = await Promise.all(
      follows.map(async (follow) => {
        const artist = await ctx.db.get(follow.artistId);
        return { ...follow, artist };
      })
    );

    return followsWithArtists.filter(f => f.artist);
  },
});

// Get user's setlists
export const getUserSetlists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    const setlists = await ctx.db
      .query("setlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Populate show and artist data
    const setlistsWithDetails = await Promise.all(
      setlists.map(async (setlist) => {
        const show = await ctx.db.get(setlist.showId);
        if (!show) return null;
        
        const [artist, venue] = await Promise.all([
          ctx.db.get(show.artistId),
          ctx.db.get(show.venueId),
        ]);
        
        return { ...setlist, show: { ...show, artist, venue } };
      })
    );

    return setlistsWithDetails.filter(Boolean);
  },
});