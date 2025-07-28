import { revalidateTag, unstable_cache } from "next/cache"

// Cache tags for different entities
export const CACHE_TAGS = {
  artists: "artists",
  artist: (id: string) => `artist-${id}`,
  artistSlug: (slug: string) => `artist-slug-${slug}`,
  shows: "shows",
  show: (id: string) => `show-${id}`,
  showSlug: (slug: string) => `show-slug-${slug}`,
  venues: "venues",
  venue: (id: string) => `venue-${id}`,
  setlists: "setlists",
  setlist: (id: string) => `setlist-${id}`,
  songs: "songs",
  song: (id: string) => `song-${id}`,
  trending: "trending",
  stats: "stats",
  artistStats: (artistId: string) => `artist-stats-${artistId}`,
} as const

// Revalidation times in seconds
export const REVALIDATION_TIMES = {
  // Static content that rarely changes
  artist: 3600, // 1 hour
  venue: 86400, // 24 hours
  song: 86400, // 24 hours

  // Dynamic content that changes frequently
  show: 1800, // 30 minutes
  setlist: 900, // 15 minutes
  trending: 300, // 5 minutes
  stats: 600, // 10 minutes

  // User-specific content
  userProfile: 60, // 1 minute
  attendance: 300, // 5 minutes
} as const

// Helper to invalidate multiple tags at once
export async function invalidateTags(tags: string[]) {
  await Promise.all(tags.map((tag) => revalidateTag(tag)))
}

// Helper to invalidate all artist-related caches
export async function invalidateArtistCache(artistId: string, slug?: string) {
  const tags = [
    CACHE_TAGS.artists,
    CACHE_TAGS.artist(artistId),
    CACHE_TAGS.artistStats(artistId),
  ]

  if (slug) {
    tags.push(CACHE_TAGS.artistSlug(slug))
  }

  await invalidateTags(tags)
}

// Helper to invalidate all show-related caches
export async function invalidateShowCache(showId: string, slug?: string) {
  const tags = [CACHE_TAGS.shows, CACHE_TAGS.show(showId)]

  if (slug) {
    tags.push(CACHE_TAGS.showSlug(slug))
  }

  await invalidateTags(tags)
}

// Helper to invalidate setlist-related caches
export async function invalidateSetlistCache(
  setlistId: string,
  showId?: string
) {
  const tags = [CACHE_TAGS.setlists, CACHE_TAGS.setlist(setlistId)]

  if (showId) {
    tags.push(CACHE_TAGS.show(showId))
  }

  await invalidateTags(tags)
}

// Create a cached function with proper error handling
export function createCachedFunction<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyParts: string[],
  options?: {
    revalidate?: number
    tags?: string[]
  }
) {
  return unstable_cache(
    async (...args: TArgs) => {
      return await fn(...args)
    },
    keyParts,
    {
      revalidate: options?.revalidate ?? 3600,
      tags: options?.tags ?? keyParts,
    }
  )
}

// Cache headers for different content types
export const CACHE_HEADERS = {
  // Immutable static assets
  static: "public, max-age=31536000, immutable",

  // Images
  image: "public, max-age=86400, stale-while-revalidate=604800",

  // API responses
  api: {
    public: "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    private: "private, max-age=0, must-revalidate",
  },

  // HTML pages
  page: {
    static: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    dynamic: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  },
} as const

// Cache service for analytics
export class CacheService {
  async get(_key: string) {
    // In production, this would use Redis or similar
    return null
  }

  async set(_key: string, _value: any, _ttl?: number) {
    // In production, this would use Redis or similar
    return true
  }

  async delete(_key: string) {
    // In production, this would use Redis or similar
    return true
  }
}

// Cache warmer for preloading popular content
export class CacheWarmer {
  async warmTrendingArtists() {
    // Preload trending artists
    revalidateTag(CACHE_TAGS.trending)
  }

  async warmPopularShows() {
    // Preload popular shows
    revalidateTag(CACHE_TAGS.shows)
  }

  async warmAll() {
    await Promise.all([this.warmTrendingArtists(), this.warmPopularShows()])
  }
}
