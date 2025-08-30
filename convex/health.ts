import { query, action } from "./_generated/server";
import { v } from "convex/values";

// Health check query for production monitoring
export const healthCheck = query({
  args: {},
  returns: v.object({
    status: v.string(),
    timestamp: v.number(),
    version: v.string(),
    database: v.boolean(),
    environment: v.object({
      hasSpotifyCredentials: v.boolean(),
      hasTicketmasterKey: v.boolean(),
      hasSetlistfmKey: v.boolean(),
    }),
  }),
  handler: async (ctx) => {
    // Test database connectivity by querying a simple record
    let databaseHealthy = true;
    try {
      await ctx.db.query("users").take(1);
    } catch (error) {
      databaseHealthy = false;
    }

    return {
      status: databaseHealthy ? "healthy" : "unhealthy",
      timestamp: Date.now(),
      version: "1.0.0",
      database: databaseHealthy,
      environment: {
        hasSpotifyCredentials: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
        hasTicketmasterKey: !!process.env.TICKETMASTER_API_KEY,
        hasSetlistfmKey: !!process.env.SETLISTFM_API_KEY,
      },
    };
  },
});

// Get system stats for monitoring
export const getSystemStats = query({
  args: {},
  returns: v.object({
    totalArtists: v.number(),
    totalShows: v.number(),
    totalSetlists: v.number(),
    totalVotes: v.number(),
    activeSyncJobs: v.number(),
    lastSyncTimestamp: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const [artists, shows, setlists, votes, syncJobs] = await Promise.all([
      ctx.db.query("artists").collect(),
      ctx.db.query("shows").collect(),
      ctx.db.query("setlists").collect(),
      ctx.db.query("votes").collect(),
      ctx.db.query("syncJobs").withIndex("by_status", (q) => q.eq("status", "running")).collect(),
    ]);

    // Find most recent sync timestamp
    const recentArtist = artists
      .filter(a => a.lastSynced)
      .sort((a, b) => (b.lastSynced || 0) - (a.lastSynced || 0))[0];

    return {
      totalArtists: artists.length,
      totalShows: shows.length,
      totalSetlists: setlists.length,
      totalVotes: votes.length,
      activeSyncJobs: syncJobs.length,
      lastSyncTimestamp: recentArtist?.lastSynced,
    };
  },
});
