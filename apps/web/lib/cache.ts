// Cache configuration and utilities for MySetlist

export const CACHE_TAGS = {
  artists: "artists",
  shows: "shows",
  venues: "venues",
  setlists: "setlists",
  votes: "votes",
  trending: "trending",
  search: "search",
} as const;

export const CACHE_DURATIONS = {
  // Static content that rarely changes
  artist: 3600, // 1 hour
  venue: 3600, // 1 hour
  
  // Dynamic content that changes frequently
  show: 300, // 5 minutes
  setlist: 300, // 5 minutes
  vote: 60, // 1 minute
  
  // API responses
  search: 300, // 5 minutes
  trending: 180, // 3 minutes
  suggestions: 600, // 10 minutes
  
  // List pages
  artistList: 300, // 5 minutes
  showList: 300, // 5 minutes
  venueList: 300, // 5 minutes
} as const;

// Cache headers for API responses
export function getCacheHeaders(
  duration: number,
  tags?: string[],
  private_cache = false,
) {
  const headers: Record<string, string> = {
    "Cache-Control": private_cache
      ? `private, max-age=${duration}`
      : `public, s-maxage=${duration}, stale-while-revalidate=${duration * 2}`,
  };

  if (tags?.length) {
    headers["Cache-Tag"] = tags.join(", ");
  }

  return headers;
}

// Revalidation helper
export async function revalidateCache(tags: string[]) {
  if (typeof window !== "undefined") {
    return; // Client-side, no-op
  }

  try {
    const { revalidateTag } = await import("next/cache");
    await Promise.all(tags.map((tag) => revalidateTag(tag)));
  } catch (error) {
    console.error("Failed to revalidate cache:", error);
  }
}