import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

// Vote on individual songs within setlists
export const voteOnSong = mutation({
  args: {
    setlistId: v.id("setlists"),
    songTitle: v.string(),
    voteType: v.literal("upvote"), // Only upvotes per ProductHunt style
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to vote");
    }

    // Check if user already voted on this song in this setlist
    const existingVote = await ctx.db
      .query("songVotes")
      .withIndex("by_user_setlist_song", (q) => 
        q.eq("userId", userId)
         .eq("setlistId", args.setlistId)
         .eq("songTitle", args.songTitle)
      )
      .first();

    if (existingVote) {
      // Remove existing vote (toggle off)
      await ctx.db.delete(existingVote._id);
    } else {
      // Create new vote
      await ctx.db.insert("songVotes", {
        userId,
        setlistId: args.setlistId,
        songTitle: args.songTitle,
        voteType: args.voteType,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

// Get vote count for a specific song in a setlist
export const getSongVotes = query({
  args: { 
    setlistId: v.id("setlists"),
    songTitle: v.string()
  },
  returns: v.object({
    upvotes: v.number(),
    userVoted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    const votes = await ctx.db
      .query("songVotes")
      .withIndex("by_setlist_song", (q) => 
        q.eq("setlistId", args.setlistId)
         .eq("songTitle", args.songTitle)
      )
      .collect();

    const userVote = userId ? votes.find(v => v.userId === userId) : null;

    return {
      upvotes: votes.length,
      userVoted: !!userVote,
    };
  },
});

// Get all votes for a setlist (for displaying song popularity)
export const getSetlistSongVotes = query({
  args: { setlistId: v.id("setlists") },
  returns: v.array(v.object({
    songTitle: v.string(),
    upvotes: v.number(),
    userVoted: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    const votes = await ctx.db
      .query("songVotes")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    // Group by song title
    const songVoteMap = new Map<string, { upvotes: number; userVoted: boolean }>();
    
    for (const vote of votes) {
      const current = songVoteMap.get(vote.songTitle) || { upvotes: 0, userVoted: false };
      current.upvotes++;
      if (userId && vote.userId === userId) {
        current.userVoted = true;
      }
      songVoteMap.set(vote.songTitle, current);
    }

    return Array.from(songVoteMap.entries()).map(([songTitle, data]) => ({
      songTitle,
      upvotes: data.upvotes,
      userVoted: data.userVoted,
    }));
  },
});
