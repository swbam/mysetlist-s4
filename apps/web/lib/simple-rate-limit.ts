// Simple in-memory rate limiter as a fallback
// This is useful for development and as a backup if the database is unavailable

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createSimpleRateLimiter(options: {
  limit: number;
  windowMs: number;
  prefix?: string;
}) {
  const { limit, windowMs, prefix = 'rl' } = options;
  
  return {
    limit: async (identifier: string) => {
      const key = `${prefix}:${identifier}`;
      const now = Date.now();
      
      const entry = store.get(key);
      
      if (!entry || entry.resetTime < now) {
        // New window
        store.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
        
        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: new Date(now + windowMs),
        };
      }
      
      if (entry.count >= limit) {
        // Rate limit exceeded
        return {
          success: false,
          limit,
          remaining: 0,
          reset: new Date(entry.resetTime),
        };
      }
      
      // Increment counter
      entry.count++;
      store.set(key, entry);
      
      return {
        success: true,
        limit,
        remaining: limit - entry.count,
        reset: new Date(entry.resetTime),
      };
    },
  };
}

// Pre-configured rate limiters for different use cases
export const ticketmasterLimiter = createSimpleRateLimiter({
  limit: 5,
  windowMs: 1000, // 5 requests per second
  prefix: 'tm',
});

export const setlistFmLimiter = createSimpleRateLimiter({
  limit: 10,
  windowMs: 60000, // 10 requests per minute
  prefix: 'sf',
});

export const musicBrainzLimiter = createSimpleRateLimiter({
  limit: 1,
  windowMs: 1000, // 1 request per second
  prefix: 'mb',
});