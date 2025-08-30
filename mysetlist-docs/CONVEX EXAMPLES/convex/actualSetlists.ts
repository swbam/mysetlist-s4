import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Compare predicted setlist against actual setlist and calculate accuracy
export const calculateAccuracy = internalMutation({
  args: {
    predictedSetlistId: v.id("setlists"),
    actualSetlistId: v.id("setlists"),
  },
  returns: v.object({
    accuracy: v.number(),
    correctSongs: v.number(),
    totalSongs: v.number(),
    missedSongs: v.array(v.string()),
    bonusSongs: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const predicted = await ctx.db.get(args.predictedSetlistId);
    const actual = await ctx.db.get(args.actualSetlistId);

    if (!predicted || !actual) {
      throw new Error("Setlists not found");
    }

    // Extract song titles from the complex song objects
    const predictedSongs = (predicted.songs as any[]).map(song => 
      typeof song === 'string' ? song : song.title || song.name
    );
    const actualSongs = (actual.songs as any[]).map(song => 
      typeof song === 'string' ? song : song.title || song.name
    );

    // Calculate matches (case-insensitive, normalized)
    const normalizeTitle = (title: string) => 
      title.toLowerCase().replace(/[^\w\s]/g, '').trim();

    const normalizedPredicted = predictedSongs.map(normalizeTitle);
    const normalizedActual = actualSongs.map(normalizeTitle);

    let correctSongs = 0;
    const missedSongs: string[] = [];
    const bonusSongs: string[] = [];

    // Check predicted songs against actual
    for (const predictedSong of predictedSongs) {
      const normalized = normalizeTitle(predictedSong);
      if (normalizedActual.includes(normalized)) {
        correctSongs++;
      } else {
        missedSongs.push(predictedSong);
      }
    }

    // Find bonus songs (in actual but not predicted)
    for (const actualSong of actualSongs) {
      const normalized = normalizeTitle(actualSong);
      if (!normalizedPredicted.includes(normalized)) {
        bonusSongs.push(actualSong);
      }
    }

    const accuracy = predictedSongs.length > 0 
      ? (correctSongs / predictedSongs.length) * 100 
      : 0;

    // Update the predicted setlist with accuracy score
    await ctx.db.patch(args.predictedSetlistId, {
      accuracy,
      comparedAt: Date.now(),
    });

    return {
      accuracy,
      correctSongs,
      totalSongs: predictedSongs.length,
      missedSongs,
      bonusSongs,
    };
  },
});

// Process all completed shows and calculate accuracies
export const processCompletedShows = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    accuraciesCalculated: v.number(),
  }),
  handler: async (ctx) => {
    // Get all completed shows
    const completedShows = await ctx.db
      .query("shows")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    let processed = 0;
    let accuraciesCalculated = 0;

    for (const show of completedShows) {
      // Get official setlist for this show
      const officialSetlist = await ctx.db
        .query("setlists")
        .withIndex("by_show", (q) => q.eq("showId", show._id))
        .filter((q) => q.eq(q.field("isOfficial"), true))
        .first();

      if (!officialSetlist) continue;

      // Get all predicted setlists for this show
      const predictedSetlists = await ctx.db
        .query("setlists")
        .withIndex("by_show", (q) => q.eq("showId", show._id))
        .filter((q) => q.eq(q.field("isOfficial"), false))
        .collect();

      for (const predicted of predictedSetlists) {
        // Skip if already calculated
        if (predicted.accuracy !== undefined) continue;

        await ctx.runMutation(internal.actualSetlists.calculateAccuracy, {
          predictedSetlistId: predicted._id,
          actualSetlistId: officialSetlist._id,
        });

        accuraciesCalculated++;

        // Award achievements to the user
        if (predicted.userId) {
          await ctx.runMutation(internal.achievements.checkAchievements, {
            userId: predicted.userId,
            action: "setlist_completed",
          });
        }
      }

      processed++;
    }

    return {
      processed,
      accuraciesCalculated,
    };
  },
});