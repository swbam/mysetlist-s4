import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    artistId: v.id("artists"),
    songId: v.id("songs"),
    isPrimaryArtist: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if relationship already exists
    const existing = await ctx.db
      .query("artistSongs")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .filter((q) => q.eq(q.field("songId"), args.songId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("artistSongs", {
      artistId: args.artistId,
      songId: args.songId,
      isPrimaryArtist: args.isPrimaryArtist,
    });
  },
});

export const getByArtistAndSong = internalQuery({
  args: {
    artistId: v.id("artists"),
    songId: v.id("songs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artistSongs")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .filter((q) => q.eq(q.field("songId"), args.songId))
      .first();
  },
});
