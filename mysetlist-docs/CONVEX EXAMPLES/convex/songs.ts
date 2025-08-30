import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getByArtist = query({
  args: { 
    artistId: v.id("artists"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Get artist-song relationships
    const artistSongs = await ctx.db
      .query("artistSongs")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .take(limit);

    // Get the actual songs
    const songs = await Promise.all(
      artistSongs.map(async (artistSong) => {
        return await ctx.db.get(artistSong.songId);
      })
    );

    // Filter to studio songs only: exclude live, remixes, commentary/etc
    const studioSongs = (songs.filter(Boolean) as Array<any>)
      .filter((s) => !s.isLive && !s.isRemix)
      .filter((s) => !/(commentary)/i.test(s.title || ''));

    return studioSongs.sort((a, b) => (b?.popularity || 0) - (a?.popularity || 0));
  },
});

export const createFromSpotify = internalMutation({
  args: {
    title: v.string(),
    album: v.optional(v.string()),
    spotifyId: v.string(),
    durationMs: v.optional(v.number()),
    popularity: v.optional(v.number()),
    trackNo: v.optional(v.number()),
    isLive: v.optional(v.boolean()),
    isRemix: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if song already exists
    const existing = await ctx.db
      .query("songs")
      .filter((q) => q.eq(q.field("spotifyId"), args.spotifyId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("songs", {
      title: args.title,
      album: args.album,
      spotifyId: args.spotifyId,
      durationMs: args.durationMs,
      popularity: args.popularity || 0,
      trackNo: args.trackNo,
      isLive: args.isLive || false,
      isRemix: args.isRemix || false,
    });
  },
});

export const getBySpotifyIdInternal = internalQuery({
  args: { spotifyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("songs")
      .filter((q) => q.eq(q.field("spotifyId"), args.spotifyId))
      .first();
  },
});

export const createInternal = internalMutation({
  args: {
    title: v.string(),
    album: v.optional(v.string()),
    spotifyId: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    popularity: v.optional(v.number()),
    trackNo: v.optional(v.number()),
    isLive: v.optional(v.boolean()),
    isRemix: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("songs", {
      title: args.title,
      album: args.album,
      spotifyId: args.spotifyId,
      durationMs: args.durationMs,
      popularity: args.popularity || 0,
      trackNo: args.trackNo,
      isLive: args.isLive || false,
      isRemix: args.isRemix || false,
    });
  },
});

export const cleanupOrphanedSongs = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all songs
    const songs = await ctx.db.query("songs").collect();
    
    for (const song of songs) {
      // Check if song has any artist relationships
      const artistSong = await ctx.db
        .query("artistSongs")
        .filter((q) => q.eq(q.field("songId"), song._id))
        .first();
      
      // If no artist relationship exists, delete the song
      if (!artistSong) {
        await ctx.db.delete(song._id);
      }
    }
  },
});

// Required functions for sync operations
export const getBySpotifyId = query({
  args: { spotifyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("songs")
      .withIndex("by_spotify_id", (q) => q.eq("spotifyId", args.spotifyId))
      .first();
  },
});

export const create = internalMutation({
  args: {
    name: v.string(),
    artist: v.string(),
    album: v.optional(v.string()),
    duration: v.optional(v.number()),
    spotifyId: v.optional(v.string()),
    popularity: v.optional(v.number()),
    isStudio: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if song already exists by Spotify ID first
    if (args.spotifyId) {
      const existing = await ctx.db
        .query("songs")
        .withIndex("by_spotify_id", (q) => q.eq("spotifyId", args.spotifyId))
        .first();
      
      if (existing) {
        return existing._id;
      }
    }

    // Create new song - map isStudio to isLive (inverted)
    return await ctx.db.insert("songs", {
      title: args.name,
      album: args.album,
      spotifyId: args.spotifyId,
      durationMs: args.duration,
      popularity: args.popularity || 0,
      trackNo: undefined,
      isLive: !args.isStudio, // Studio songs are NOT live
      isRemix: false,
    });
  },
});
