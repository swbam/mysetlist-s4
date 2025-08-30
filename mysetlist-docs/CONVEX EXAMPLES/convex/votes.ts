import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

export const submitVote = mutation({
  args: {
    setlistId: v.id("setlists"),
    voteType: v.union(v.literal("accurate"), v.literal("inaccurate")),
    songVotes: v.optional(v.array(v.object({
      songName: v.string(),
      vote: v.union(v.literal("correct"), v.literal("incorrect"), v.literal("missing")),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to vote");
    }

    // Check if user already voted on this setlist
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_user_and_setlist", (q) => q.eq("userId", userId).eq("setlistId", args.setlistId))
      .first();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        voteType: args.voteType,
        songVotes: args.songVotes,
        createdAt: Date.now(), // Update timestamp
      });
    } else {
      // Create new vote
      await ctx.db.insert("votes", {
        userId,
        setlistId: args.setlistId,
        voteType: args.voteType,
        songVotes: args.songVotes,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getUserVote = query({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("votes")
      .withIndex("by_user_and_setlist", (q) => q.eq("userId", userId).eq("setlistId", args.setlistId))
      .first();
  },
});

export const getSetlistVotes = query({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    const totalVotes = votes.length;
    const accurateVotes = votes.filter(v => v.voteType === "accurate").length;
    
    return {
      total: totalVotes,
      accurate: accurateVotes,
      inaccurate: totalVotes - accurateVotes,
      accuracy: totalVotes > 0 ? (accurateVotes / totalVotes) * 100 : 0,
      votes: votes, // Real-time updates!
    };
  },
});

export const getVotesSummary = query({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_setlist", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    // Calculate overall accuracy
    const totalVotes = votes.length;
    const accurateVotes = votes.filter(v => v.voteType === "accurate").length;
    
    // Calculate song-level accuracy if detailed votes exist
    const songAccuracy: Record<string, {correct: number, incorrect: number, missing: number}> = {};
    
    votes.forEach(vote => {
      if (vote.songVotes) {
        vote.songVotes.forEach(songVote => {
          if (!songAccuracy[songVote.songName]) {
            songAccuracy[songVote.songName] = { correct: 0, incorrect: 0, missing: 0 };
          }
          songAccuracy[songVote.songName][songVote.vote]++;
        });
      }
    });

    return {
      overall: {
        total: totalVotes,
        accurate: accurateVotes,
        accuracy: totalVotes > 0 ? (accurateVotes / totalVotes) * 100 : 0,
      },
      songLevel: songAccuracy,
    };
  },
});