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
