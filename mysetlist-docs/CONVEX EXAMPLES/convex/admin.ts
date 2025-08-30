import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

// Check if user is admin
const requireAdmin = async (ctx: any) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
};

// Get all users for admin management
export const getAllUsers = query({
  args: { 
    limit: v.optional(v.number()),
    role: v.optional(v.union(v.literal("user"), v.literal("admin")))
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const limit = args.limit || 50;
    let query = ctx.db.query("users");
    
    const users = await query
      .order("desc")
      .take(limit);
    
    // Filter by role if specified
    if (args.role) {
      return users.filter(user => user.role === args.role);
    }
    
    return users;
  },
});

// Ban/unban user
export const toggleUserBan = mutation({
  args: {
    userId: v.id("users"),
    banned: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    await ctx.db.patch(args.userId, {
      role: args.banned ? "banned" : "user",
    });
    
    return null;
  },
});

// Flag content for review
export const flagContent = mutation({
  args: {
    contentType: v.union(v.literal("setlist"), v.literal("vote"), v.literal("comment")),
    contentId: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to flag content");
    }

    await ctx.db.insert("contentFlags", {
      reporterId: userId,
      contentType: args.contentType,
      contentId: args.contentId,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });
    
    return null;
  },
});

// Get flagged content for admin review
export const getFlaggedContent = query({
  args: { 
    status: v.optional(v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed")))
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    if (args.status) {
      // Narrowed branch ensures type for withIndex closure
      const flags = await ctx.db
        .query("contentFlags")
        .withIndex("by_status", (q) => q.eq("status", args.status as "pending" | "reviewed" | "dismissed"))
        .order("desc")
        .take(50);
      return flags;
    } else {
      const flags = await ctx.db
        .query("contentFlags")
        .order("desc")
        .take(50);
      return flags;
    }
  },
});

// Verify setlist as official
export const verifySetlist = mutation({
  args: {
    setlistId: v.id("setlists"),
    verified: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    await ctx.db.patch(args.setlistId, {
      verified: args.verified,
      isOfficial: args.verified,
    });
    
    return null;
  },
});

// Get admin dashboard stats
export const getAdminStats = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    totalArtists: v.number(),
    totalShows: v.number(),
    totalSetlists: v.number(),
    totalVotes: v.number(),
    pendingFlags: v.number(),
    recentActivity: v.array(v.any()),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    // Get counts
    const [users, artists, shows, setlists, votes, flags] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("artists").collect(),
      ctx.db.query("shows").collect(),
      ctx.db.query("setlists").collect(),
      ctx.db.query("votes").collect(),
      ctx.db.query("contentFlags").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
    ]);

    // Get recent activity (last 10 setlists)
    const recentSetlists = await ctx.db
      .query("setlists")
      .order("desc")
      .take(10);

    const recentActivity = await Promise.all(
      recentSetlists.map(async (setlist) => {
        const show = await ctx.db.get(setlist.showId);
        const artist = show ? await ctx.db.get(show.artistId) : null;
        const venue = show ? await ctx.db.get(show.venueId) : null;
        
        return {
          type: "setlist_created",
          setlist,
          show: show ? { ...show, artist, venue } : null,
          timestamp: setlist._creationTime,
        };
      })
    );

    return {
      totalUsers: users.length,
      totalArtists: artists.length,
      totalShows: shows.length,
      totalSetlists: setlists.length,
      totalVotes: votes.length,
      pendingFlags: flags.length,
      recentActivity,
    };
  },
});
