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

// Update trending scores based on recent activity (called by cron)
export const updateTrendingScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const artists = await ctx.db.query("artists").collect();
    
    for (const artist of artists) {
      let score = 0;
      
      // Base popularity score (0-100 from Spotify)
      score += (artist.popularity || 0) * 0.3;
      
      // Follower count (normalized, max 50 points)
      const followerScore = Math.min(50, Math.log10((artist.followers || 1) / 1000) * 10);
      score += Math.max(0, followerScore);
      
      // Update trending score
      await ctx.db.patch(artist._id, {
        trendingScore: Math.max(0, score),
      });
    }
    
    console.log(`Updated trending scores for ${artists.length} artists`);
  },
});
