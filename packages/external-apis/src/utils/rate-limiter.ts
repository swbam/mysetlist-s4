export class RateLimiter {
  private inMemoryLimits: Map<string, { count: number; resetTime: number }> = new Map();

  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const window = windowSeconds * 1000;

    // Get or create limit tracking
    let limitData = this.inMemoryLimits.get(key);
    
    if (!limitData || now > limitData.resetTime) {
      // Reset window
      limitData = {
        count: 0,
        resetTime: now + window
      };
    }

    // Check if limit exceeded
    if (limitData.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: limitData.resetTime,
      };
    }

    // Increment count
    limitData.count++;
    this.inMemoryLimits.set(key, limitData);

    return {
      allowed: true,
      remaining: limit - limitData.count,
      resetTime: limitData.resetTime,
    };
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.inMemoryLimits.entries()) {
      if (now > data.resetTime) {
        this.inMemoryLimits.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
} 