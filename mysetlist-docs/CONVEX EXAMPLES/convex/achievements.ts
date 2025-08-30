import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

// Achievement definitions for setlist prediction accuracy
export const ACHIEVEMENTS = {
  FIRST_PREDICTION: {
    id: "first_prediction",
    name: "First Prediction",
    description: "Made your first setlist prediction",
    icon: "🎯",
    points: 10,
  },
  PERFECT_PREDICTION: {
    id: "perfect_prediction", 
    name: "Perfect Prediction",
    description: "Got 100% accuracy on a setlist",
    icon: "🎯",
    points: 100,
  },
  ACCURACY_MASTER: {
    id: "accuracy_master",
    name: "Accuracy Master", 
    description: "Achieved 80%+ accuracy across 10 predictions",
    icon: "🏆",
    points: 250,
  },
  VOTE_CHAMPION: {
    id: "vote_champion",
    name: "Vote Champion",
    description: "Cast 100 song votes",
    icon: "🗳️", 
    points: 50,
  },
  PREDICTION_STREAK: {
    id: "prediction_streak",
    name: "Prediction Streak",
    description: "Made predictions for 5 shows in a row",
    icon: "🔥",
    points: 75,
  },
} as const;

// Get user achievements
export const getUserAchievements = query({
  args: {},
  returns: v.array(v.object({
    achievementId: v.string(),
    unlockedAt: v.number(),
    points: v.number(),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return userAchievements.map(achievement => ({
      achievementId: achievement.achievementId,
      unlockedAt: achievement.unlockedAt,
      points: achievement.points,
    }));
  },
});

// Calculate user accuracy score
export const getUserAccuracyScore = query({
  args: {},
  returns: v.object({
    totalPredictions: v.number(),
    correctPredictions: v.number(),
    accuracy: v.number(),
    totalPoints: v.number(),
    rank: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        totalPoints: 0,
      };
    }

    // Get user's setlists with accuracy scores
    const userSetlists = await ctx.db
      .query("setlists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isOfficial"), false))
      .collect();

    const accuracies = userSetlists
      .filter(s => s.accuracy !== undefined)
      .map(s => s.accuracy!);

    const averageAccuracy = accuracies.length > 0 
      ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length 
      : 0;

    // Get total achievement points
    const achievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const totalPoints = achievements.reduce((sum, achievement) => sum + achievement.points, 0);

    return {
      totalPredictions: userSetlists.length,
      correctPredictions: accuracies.length,
      accuracy: averageAccuracy,
      totalPoints,
    };
  },
});

// Award achievement to user
export const awardAchievement = internalMutation({
  args: {
    userId: v.id("users"),
    achievementId: v.string(),
    points: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if user already has this achievement
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_and_achievement", (q) => 
        q.eq("userId", args.userId).eq("achievementId", args.achievementId)
      )
      .first();

    if (existing) return null;

    // Award the achievement
    await ctx.db.insert("userAchievements", {
      userId: args.userId,
      achievementId: args.achievementId,
      points: args.points,
      unlockedAt: Date.now(),
    });

    return null;
  },
});

// Check and award achievements after user actions
export const checkAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.union(
      v.literal("first_prediction"),
      v.literal("song_vote"),
      v.literal("setlist_completed")
    ),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const newAchievements: string[] = [];

    if (args.action === "first_prediction") {
      // Check if this is their first prediction
      const predictions = await ctx.db
        .query("setlists")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("isOfficial"), false))
        .collect();

      if (predictions.length === 1) {
        await ctx.runMutation("achievements:awardAchievement", {
          userId: args.userId,
          achievementId: ACHIEVEMENTS.FIRST_PREDICTION.id,
          points: ACHIEVEMENTS.FIRST_PREDICTION.points,
        });
        newAchievements.push(ACHIEVEMENTS.FIRST_PREDICTION.id);
      }
    }

    if (args.action === "song_vote") {
      // Check vote champion achievement
      const votes = await ctx.db
        .query("songVotes")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      if (votes.length >= 100) {
        await ctx.runMutation("achievements:awardAchievement", {
          userId: args.userId,
          achievementId: ACHIEVEMENTS.VOTE_CHAMPION.id,
          points: ACHIEVEMENTS.VOTE_CHAMPION.points,
        });
        newAchievements.push(ACHIEVEMENTS.VOTE_CHAMPION.id);
      }
    }

    if (args.action === "setlist_completed") {
      // Check for perfect prediction
      const userScore = await ctx.runQuery("achievements:getUserAccuracyScore", {});
      
      if (userScore.accuracy === 100 && userScore.totalPredictions >= 1) {
        await ctx.runMutation("achievements:awardAchievement", {
          userId: args.userId,
          achievementId: ACHIEVEMENTS.PERFECT_PREDICTION.id,
          points: ACHIEVEMENTS.PERFECT_PREDICTION.points,
        });
        newAchievements.push(ACHIEVEMENTS.PERFECT_PREDICTION.id);
      }

      // Check for accuracy master
      if (userScore.accuracy >= 80 && userScore.totalPredictions >= 10) {
        await ctx.runMutation("achievements:awardAchievement", {
          userId: args.userId,
          achievementId: ACHIEVEMENTS.ACCURACY_MASTER.id,
          points: ACHIEVEMENTS.ACCURACY_MASTER.points,
        });
        newAchievements.push(ACHIEVEMENTS.ACCURACY_MASTER.id);
      }
    }

    return newAchievements;
  },
});