import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get user leaderboard based on voting accuracy and activity
export const getUserLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    userId: v.id("users"),
    username: v.string(),
    totalVotes: v.number(),
    accurateVotes: v.number(),
    accuracyPercentage: v.number(),
    totalSetlists: v.number(),
    score: v.number(),
    rank: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Get all users with their voting stats
    const users = await ctx.db.query("users").collect();
    const userStats = await Promise.all(
      users.map(async (user) => {
        // Get user's votes
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        
        const totalVotes = votes.length;
        const accurateVotes = votes.filter(v => v.voteType === "accurate").length;
        const accuracyPercentage = totalVotes > 0 ? (accurateVotes / totalVotes) * 100 : 0;
        
        // Get user's setlists
        const setlists = await ctx.db
          .query("setlists")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        
        // Calculate score: accuracy weight + activity weight
        const activityScore = Math.min(50, totalVotes * 2); // Max 50 points for activity
        const accuracyScore = totalVotes >= 5 ? accuracyPercentage * 0.5 : 0; // Only count accuracy after 5+ votes
        const setlistScore = Math.min(25, setlists.length * 5); // Max 25 points for setlists
        const score = Math.round(activityScore + accuracyScore + setlistScore);
        
        return {
          userId: user._id,
          username: user.username,
          totalVotes,
          accurateVotes,
          accuracyPercentage: Math.round(accuracyPercentage),
          totalSetlists: setlists.length,
          score,
        };
      })
    );
    
    // Sort by score and add ranks
    const sortedStats = userStats
      .filter(stat => stat.totalVotes > 0) // Only include users who have voted
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
      }));
    
    return sortedStats;
  },
});

// Get artist leaderboard based on trending scores and activity
export const getArtistLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    artistId: v.id("artists"),
    name: v.string(),
    slug: v.string(),
    trendingScore: v.number(),
    totalShows: v.number(),
    totalSetlists: v.number(),
    totalVotes: v.number(),
    followers: v.optional(v.number()),
    popularity: v.optional(v.number()),
    rank: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Get all active artists with their activity stats
    const artists = await ctx.db
      .query("artists")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const artistStats = await Promise.all(
      artists.map(async (artist) => {
        // Get artist's shows
        const shows = await ctx.db
          .query("shows")
          .withIndex("by_artist", (q) => q.eq("artistId", artist._id))
          .collect();
        
        // Get setlists for artist's shows
        let totalSetlists = 0;
        let totalVotes = 0;
        
        for (const show of shows) {
          const setlists = await ctx.db
            .query("setlists")
            .withIndex("by_show", (q) => q.eq("showId", show._id))
            .collect();
          
          totalSetlists += setlists.length;
          
          for (const setlist of setlists) {
            const votes = await ctx.db
              .query("votes")
              .withIndex("by_setlist", (q) => q.eq("setlistId", setlist._id))
              .collect();
            totalVotes += votes.length;
          }
        }
        
        return {
          artistId: artist._id,
          name: artist.name,
          slug: artist.slug,
          trendingScore: artist.trendingScore || 0,
          totalShows: shows.length,
          totalSetlists,
          totalVotes,
          followers: artist.followers,
          popularity: artist.popularity,
        };
      })
    );
    
    // Sort by trending score and add ranks
    const sortedStats = artistStats
      .filter(stat => stat.trendingScore > 0 || stat.totalVotes > 0)
      .sort((a, b) => {
        // Primary sort: trending score
        if (b.trendingScore !== a.trendingScore) {
          return b.trendingScore - a.trendingScore;
        }
        // Secondary sort: total votes
        if (b.totalVotes !== a.totalVotes) {
          return b.totalVotes - a.totalVotes;
        }
        // Tertiary sort: followers
        return (b.followers || 0) - (a.followers || 0);
      })
      .slice(0, limit)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
      }));
    
    return sortedStats;
  },
});

// Update trending scores based on recent activity (called by cron)
export const updateTrendingScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const artists = await ctx.db.query("artists").collect();
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    for (const artist of artists) {
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
      
      // Update trending score
      await ctx.db.patch(artist._id, {
        trendingScore: Math.max(0, score),
      });
    }
    
    console.log(`Updated trending scores for ${artists.length} artists`);
  },
});