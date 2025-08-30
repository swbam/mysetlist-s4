import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

// Get user's voting and setlist activity for their dashboard
export const getUserActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 50;

    // Get user's song votes
    const songVotes = await ctx.db
      .query("songVotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    const activity: any[] = [];

    for (const vote of songVotes) {
      // Get setlist details
      const setlist = await ctx.db.get(vote.setlistId);
      if (!setlist) continue;

      // Get show details
      const show = await ctx.db.get(setlist.showId);
      if (!show) continue;

      // Get artist and venue details
      const artist = await ctx.db.get(show.artistId);
      const venue = await ctx.db.get(show.venueId);

      activity.push({
        _id: vote._id,
        songTitle: vote.songTitle,
        voteType: vote.voteType,
        createdAt: vote._creationTime,
        show: {
          _id: show._id,
          date: show.date,
          status: show.status,
          artist: artist ? {
            name: artist.name,
            images: artist.images,
          } : undefined,
          venue: venue ? {
            name: venue.name,
            city: venue.city,
          } : undefined,
        },
      });
    }

    return activity;
  },
});

// Get user's setlist contributions
export const getUserSetlistContributions = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 20;

    // Get user's setlist contributions (non-official setlists they contributed to)
    const userSetlists = await ctx.db
      .query("setlists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isOfficial"), false))
      .order("desc")
      .take(limit);

    const contributions: any[] = [];

    for (const setlist of userSetlists) {
      // Get show details
      const show = await ctx.db.get(setlist.showId);
      if (!show) continue;

      // Get artist and venue details
      const artist = await ctx.db.get(show.artistId);
      const venue = await ctx.db.get(show.venueId);

      const songs = setlist.songs as any[];
      
      contributions.push({
        _id: setlist._id,
        showId: setlist.showId,
        songsCount: songs.length,
        createdAt: setlist._creationTime,
        show: {
          _id: show._id,
          date: show.date,
          status: show.status,
          artist: artist ? {
            name: artist.name,
            images: artist.images,
          } : undefined,
          venue: venue ? {
            name: venue.name,
            city: venue.city,
          } : undefined,
        },
      });
    }

    return contributions;
  },
});
