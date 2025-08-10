// Optimized cache configuration for production performance
export const cacheConfig = {
  // Edge-side caching for static assets
  static: {
    images: {
      maxAge: 31536000, // 1 year
      staleWhileRevalidate: 86400, // 1 day
    },
    fonts: {
      maxAge: 31536000, // 1 year
      immutable: true,
    },
    css: {
      maxAge: 31536000, // 1 year
      immutable: true,
    },
    js: {
      maxAge: 31536000, // 1 year
      immutable: true,
    },
  },

  // API response caching
  api: {
    artists: {
      list: 3600, // 1 hour
      detail: 3600, // 1 hour
      shows: 1800, // 30 minutes
      songs: 86400, // 1 day
    },
    shows: {
      list: 1800, // 30 minutes
      detail: 3600, // 1 hour
    },
    search: {
      suggestions: 300, // 5 minutes
      results: 600, // 10 minutes
    },
    trending: {
      artists: 3600, // 1 hour
      shows: 1800, // 30 minutes
    },
  },

  // ISR (Incremental Static Regeneration) timings
  isr: {
    homepage: 3600, // 1 hour
    artistPage: 3600, // 1 hour
    showPage: 1800, // 30 minutes
    venuePage: 86400, // 1 day
    trending: 3600, // 1 hour
  },

  // Redis/Upstash cache keys and TTLs
  redis: {
    prefix: "mysetlist:",
    ttl: {
      session: 86400, // 1 day
      apiResponse: 600, // 10 minutes
      userPreferences: 2592000, // 30 days
      rateLimit: 60, // 1 minute
    },
  },

  // CDN headers for Vercel Edge Network
  cdn: {
    // Cache-Control headers
    control: {
      public: "public, max-age=0, must-revalidate",
      private: "private, no-cache, no-store, must-revalidate",
      static: "public, max-age=31536000, immutable",
      api: "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
    // Vary headers for proper caching
    vary: ["Accept-Encoding", "Authorization"],
  },
};

// Helper to generate cache headers
export function getCacheHeaders(type: keyof typeof cacheConfig.cdn.control) {
  return {
    "Cache-Control": cacheConfig.cdn.control[type],
    "CDN-Cache-Control": cacheConfig.cdn.control[type],
    "Vercel-CDN-Cache-Control": cacheConfig.cdn.control[type],
  };
}

// Helper to get API cache duration
export function getApiCacheDuration(endpoint: string): number {
  const parts = endpoint.split("/").filter(Boolean);

  if (parts.includes("artists")) {
    if (parts.includes("shows")) return cacheConfig.api.artists.shows;
    if (parts.includes("songs")) return cacheConfig.api.artists.songs;
    return cacheConfig.api.artists.detail;
  }

  if (parts.includes("shows")) {
    return parts.length > 2
      ? cacheConfig.api.shows.detail
      : cacheConfig.api.shows.list;
  }

  if (parts.includes("search")) {
    return parts.includes("suggestions")
      ? cacheConfig.api.search.suggestions
      : cacheConfig.api.search.results;
  }

  if (parts.includes("trending")) {
    return parts.includes("artists")
      ? cacheConfig.api.trending.artists
      : cacheConfig.api.trending.shows;
  }

  // Default cache duration
  return 300; // 5 minutes
}
