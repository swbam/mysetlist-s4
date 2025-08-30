import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  // Custom users table for app-specific data
  users: defineTable({
    authId: v.string(), // Clerk user ID (string)
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    spotifyId: v.optional(v.string()),
    avatar: v.optional(v.string()),
    username: v.string(),
    bio: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("banned")),
    preferences: v.optional(v.object({
      emailNotifications: v.boolean(),
      favoriteGenres: v.array(v.string()),
    })),
    createdAt: v.number(),
  })
    .index("by_auth_id", ["authId"])
    .index("by_username", ["username"])
    .index("by_email", ["email"]),



  artists: defineTable({
    slug: v.string(),
    name: v.string(),
    spotifyId: v.optional(v.string()),
    ticketmasterId: v.optional(v.string()),
    genres: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    popularity: v.optional(v.number()),
    followers: v.optional(v.number()),
    trendingScore: v.optional(v.number()),
    isActive: v.boolean(),
    lastSynced: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_trending_score", ["trendingScore"])
    .index("by_spotify_id", ["spotifyId"]) 
    .index("by_ticketmaster_id", ["ticketmasterId"]) 
    .index("by_name", ["name"]),

  venues: defineTable({
    name: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    address: v.optional(v.string()),
    capacity: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    ticketmasterId: v.optional(v.string()),
  })
    .index("by_location", ["city", "country"]) 
    .index("by_ticketmaster_id", ["ticketmasterId"]),

  shows: defineTable({
    slug: v.optional(v.string()),
    artistId: v.id("artists"),
    venueId: v.id("venues"),
    date: v.string(),
    startTime: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("completed"), v.literal("cancelled")),
    ticketmasterId: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
    setlistfmId: v.optional(v.string()),
    lastSynced: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_artist", ["artistId"])
    .index("by_venue", ["venueId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"]),

  songs: defineTable({
    title: v.string(),
    album: v.optional(v.string()),
    spotifyId: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    popularity: v.optional(v.number()),
    trackNo: v.optional(v.number()),
    isLive: v.boolean(),
    isRemix: v.boolean(),
  })
    .index("by_spotify_id", ["spotifyId"]),

  artistSongs: defineTable({
    artistId: v.id("artists"),
    songId: v.id("songs"),
    isPrimaryArtist: v.boolean(),
  })
    .index("by_artist", ["artistId"])
    .index("by_song", ["songId"]),

  setlists: defineTable({
    showId: v.id("shows"),
    userId: v.optional(v.id("users")),
    songs: v.array(v.object({
      title: v.string(),
      album: v.optional(v.string()),
      duration: v.optional(v.number()),
      songId: v.optional(v.id("songs")),
    })),
    verified: v.boolean(),
    source: v.union(v.literal("setlistfm"), v.literal("user_submitted")),
    lastUpdated: v.number(),
    isOfficial: v.optional(v.boolean()),
    confidence: v.optional(v.number()),
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
    setlistfmId: v.optional(v.string()),
    accuracy: v.optional(v.number()), // Calculated accuracy vs actual setlist
    comparedAt: v.optional(v.number()), // When accuracy was calculated
  })
    .index("by_show", ["showId"])
    .index("by_user", ["userId"])
    .index("by_show_and_user", ["showId", "userId"]),

  // Votes system per CONVEX.md specification
  votes: defineTable({
    userId: v.id("users"),
    setlistId: v.id("setlists"),
    voteType: v.union(v.literal("accurate"), v.literal("inaccurate")),
    songVotes: v.optional(v.array(v.object({
      songName: v.string(),
      vote: v.union(v.literal("correct"), v.literal("incorrect"), v.literal("missing")),
    }))),
    createdAt: v.number(),
  })
    .index("by_setlist", ["setlistId"])
    .index("by_user", ["userId"])
    .index("by_user_and_setlist", ["userId", "setlistId"]),

  userFollows: defineTable({
    userId: v.id("users"),
    artistId: v.id("artists"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_artist", ["artistId"])
    .index("by_user_and_artist", ["userId", "artistId"]),

  syncStatus: defineTable({
    isActive: v.boolean(),
    currentPhase: v.string(),
    lastSync: v.number(),
  }),

  syncJobs: defineTable({
    type: v.union(
      v.literal("artist_basic"),
      v.literal("artist_shows"),
      v.literal("artist_catalog"),
      v.literal("trending_sync"),
      v.literal("active_sync"),
      v.literal("full_sync"),
      v.literal("venue_ecosystem_sync")
    ),
    entityId: v.optional(v.string()),
    priority: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    retryCount: v.number(),
    maxRetries: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    // Progress tracking fields
    currentPhase: v.optional(v.string()),
    totalSteps: v.optional(v.number()),
    completedSteps: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    itemsProcessed: v.optional(v.number()),
    totalItems: v.optional(v.number()),
    progressPercentage: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // Cached trending data from Ticketmaster
  trendingShows: defineTable({
    ticketmasterId: v.string(),
    artistTicketmasterId: v.optional(v.string()),
    artistName: v.string(),
    venueName: v.string(),
    venueCity: v.string(),
    venueCountry: v.string(),
    date: v.string(),
    startTime: v.optional(v.string()),
    artistImage: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    status: v.string(),
    lastUpdated: v.number(),
  }),

  trendingArtists: defineTable({
    ticketmasterId: v.string(),
    name: v.string(),
    genres: v.array(v.string()),
    images: v.array(v.string()),
    upcomingEvents: v.number(),
    url: v.optional(v.string()),
    lastUpdated: v.number(),
  }),

  // Individual song votes within setlists (ProductHunt style)
  songVotes: defineTable({
    userId: v.id("users"),
    setlistId: v.id("setlists"),
    songTitle: v.string(),
    voteType: v.literal("upvote"),
    createdAt: v.number(),
  })
    .index("by_user_setlist_song", ["userId", "setlistId", "songTitle"])
    .index("by_setlist_song", ["setlistId", "songTitle"])
    .index("by_setlist", ["setlistId"])
    .index("by_user", ["userId"]),

  // Content flagging for moderation
  contentFlags: defineTable({
    reporterId: v.id("users"),
    contentType: v.union(v.literal("setlist"), v.literal("vote"), v.literal("comment")),
    contentId: v.string(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed")),
    createdAt: v.number(),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_reporter", ["reporterId"]),

  // User achievements for gamification
  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.string(),
    points: v.number(),
    unlockedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_achievement", ["userId", "achievementId"]),
};

export default defineSchema({
  ...applicationTables,
});