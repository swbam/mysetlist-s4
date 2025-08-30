import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "./auth";

export const create = mutation({
  args: {
    showId: v.id("shows"),
    songs: v.array(v.object({
      title: v.string(),
      album: v.optional(v.string()),
      duration: v.optional(v.number()),
      songId: v.optional(v.id("songs")),
    })),
    isOfficial: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // Check if user already has a setlist for this show
    if (userId) {
      const existing = await ctx.db
        .query("setlists")
        .withIndex("by_show_and_user", (q) => 
          q.eq("showId", args.showId).eq("userId", userId)
        )
        .first();
      
      if (existing) {
        // Update existing setlist
        await ctx.db.patch(existing._id, {
          songs: args.songs,
          lastUpdated: Date.now(),
        });
        return existing._id;
      }
    }
    
    return await ctx.db.insert("setlists", {
      showId: args.showId,
      userId: userId || undefined,
      songs: args.songs,
      verified: false,
      source: "user_submitted",
      lastUpdated: Date.now(),
      isOfficial: args.isOfficial || false,
      confidence: 0.5,
      upvotes: 0,
      downvotes: 0,
    });
  },
});

export const addSongToSetlist = mutation({
  args: {
    showId: v.id("shows"),
    song: v.object({
      title: v.string(),
      album: v.optional(v.string()),
      duration: v.optional(v.number()),
      songId: v.optional(v.id("songs")),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to add songs to setlist");
    }
    
    // Find the shared community setlist for this show (not user-specific)
    const existingSetlist = await ctx.db
      .query("setlists")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .filter((q) => q.eq(q.field("isOfficial"), false))
      .first();
    
    if (existingSetlist) {
      // Add song if not already present
      const songExists = existingSetlist.songs.some(s => s.title === args.song.title);
      if (!songExists) {
        await ctx.db.patch(existingSetlist._id, {
          songs: [...existingSetlist.songs, args.song],
          lastUpdated: Date.now(),
        });
      }
      return existingSetlist._id;
    } else {
      // Create new shared setlist for this show
      return await ctx.db.insert("setlists", {
        showId: args.showId,
        userId: undefined, // Shared setlist, not user-specific
        songs: [args.song],
        verified: false,
        source: "user_submitted",
        lastUpdated: Date.now(),
        isOfficial: false,
        confidence: 0.5,
        upvotes: 0,
        downvotes: 0,
      });
    }
  },
});

export const createOfficial = internalMutation({
  args: {
    showId: v.id("shows"),
    songs: v.array(v.object({
      title: v.string(),
      album: v.optional(v.string()),
      duration: v.optional(v.number()),
      songId: v.optional(v.id("songs")),
    })),
    setlistfmId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if official setlist already exists
    const existing = await ctx.db
      .query("setlists")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .filter((q) => q.eq(q.field("isOfficial"), true))
      .first();

    if (existing) {
      // Update existing official setlist
      await ctx.db.patch(existing._id, {
        songs: args.songs,
        lastUpdated: Date.now(),
        setlistfmId: args.setlistfmId,
      });
      return existing._id;
    }

    return await ctx.db.insert("setlists", {
      showId: args.showId,
      userId: undefined,
      songs: args.songs,
      verified: true,
      source: "setlistfm",
      lastUpdated: Date.now(),
      isOfficial: true,
      confidence: 1.0,
      upvotes: 0,
      downvotes: 0,
      setlistfmId: args.setlistfmId,
    });
  },
});

export const getByShow = query({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const setlists = await ctx.db
      .query("setlists")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .collect();

    // Get user data for each setlist
    const enrichedSetlists = await Promise.all(
      setlists.map(async (setlist) => {
        let username = "Community";
        if (setlist.userId) {
          const user = await ctx.db.get(setlist.userId);
          if (user) {
            username = user.username;
          }
        } else if (setlist.isOfficial) {
          username = "setlist.fm";
        }
        
        return {
          ...setlist,
          username,
          score: (setlist.upvotes || 0),
        };
      })
    );

    // Sort by official first, then by score, then by creation time
    return enrichedSetlists.sort((a, b) => {
      if (a.isOfficial && !b.isOfficial) return -1;
      if (!a.isOfficial && b.isOfficial) return 1;
      if (a.score !== b.score) return b.score - a.score;
      return b._creationTime - a._creationTime;
    });
  },
});

export const autoGenerateSetlist = internalMutation({
  args: {
    showId: v.id("shows"),
    artistId: v.id("artists"),
  },
  handler: async (ctx, args) => {
    // Check if a setlist already exists for this show
    const existingSetlist = await ctx.db
      .query("setlists")
      .withIndex("by_show", (q) => q.eq("showId", args.showId))
      .first();

    if (existingSetlist) {
      return existingSetlist._id; // Don't create duplicate
    }

    // Get all songs for this artist
    const artistSongs = await ctx.db
      .query("artistSongs")
      .withIndex("by_artist", (q) => q.eq("artistId", args.artistId))
      .collect();

    if (artistSongs.length === 0) {
      console.log(`No songs found for artist ${args.artistId}, skipping setlist generation`);
      return null;
    }

    // Get the actual song records and filter out live/remix versions
    const songs = await Promise.all(
      artistSongs.map(async (artistSong) => {
        return await ctx.db.get(artistSong.songId);
      })
    );

    const studioSongs = songs
      .filter((song): song is NonNullable<typeof song> => song !== null)
      .filter(song => !song.isLive && !song.isRemix)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // Sort by popularity

    if (studioSongs.length === 0) {
      console.log(`No studio songs found for artist ${args.artistId}, skipping setlist generation`);
      return null;
    }

    // Select 5 random songs from the catalog, weighted towards more popular songs
    const selectedSongs: Array<{title: string, album?: string, duration?: number, songId?: Id<"songs">}> = [];
    const songsToChooseFrom = [...studioSongs];
    const numSongs = Math.min(5, songsToChooseFrom.length);

    for (let i = 0; i < numSongs; i++) {
      // Weighted random selection - higher popularity songs have better chance
      const totalPopularity = songsToChooseFrom.reduce((sum, song) => sum + (song.popularity || 1), 0);
      let randomValue = Math.random() * totalPopularity;
      
      let selectedIndex = 0;
      for (let j = 0; j < songsToChooseFrom.length; j++) {
        randomValue -= (songsToChooseFrom[j].popularity || 1);
        if (randomValue <= 0) {
          selectedIndex = j;
          break;
        }
      }

      const selectedSong = songsToChooseFrom[selectedIndex];
      selectedSongs.push({
        title: selectedSong.title,
        album: selectedSong.album,
        duration: selectedSong.durationMs,
        songId: selectedSong._id,
      });
      songsToChooseFrom.splice(selectedIndex, 1); // Remove to avoid duplicates
    }

    // Create the auto-generated setlist
    const setlistId = await ctx.db.insert("setlists", {
      showId: args.showId,
      userId: undefined, // System-generated
      songs: selectedSongs,
      verified: false,
      source: "user_submitted",
      lastUpdated: Date.now(),
      isOfficial: false,
      confidence: 0.3, // Lower confidence for auto-generated
      upvotes: 0,
      downvotes: 0,
    });

    console.log(`Auto-generated setlist for show ${args.showId} with ${selectedSongs.length} songs`);
    return setlistId;
  },
});