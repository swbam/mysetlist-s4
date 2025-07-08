export class IntelligentCache {
  private inMemoryCache: Map<
    string,
    { data: any; expiry: number; metadata?: any }
  > = new Map();

  async get<T>(key: string): Promise<T | null> {
    const cached = this.inMemoryCache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiry) {
      this.inMemoryCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  async set(
    key: string,
    data: any,
    ttlSeconds = 3600,
    options: {
      refreshThreshold?: number; // Refresh when TTL is below this
      staleWhileRevalidate?: boolean;
    } = {}
  ): Promise<void> {
    const expiry = Date.now() + ttlSeconds * 1000;

    const metadata = options.refreshThreshold
      ? {
          refreshThreshold: options.refreshThreshold,
          staleWhileRevalidate: options.staleWhileRevalidate,
          lastUpdated: Date.now(),
        }
      : undefined;

    this.inMemoryCache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone to avoid mutations
      expiry,
      metadata,
    });

    // Set metadata if provided
    if (metadata) {
      this.inMemoryCache.set(`${key}:meta`, {
        data: metadata,
        expiry,
      });
    }
  }

  async shouldRefresh(key: string): Promise<boolean> {
    const cached = this.inMemoryCache.get(key);
    const metaCached = this.inMemoryCache.get(`${key}:meta`);

    if (!cached || !metaCached) return false;

    const now = Date.now();
    const timeUntilExpiry = cached.expiry - now;
    const metadata = metaCached.data;

    return timeUntilExpiry <= metadata.refreshThreshold * 1000;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Simple pattern matching for in-memory cache
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.inMemoryCache.keys()) {
      if (regex.test(key)) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.inMemoryCache.delete(key);
    this.inMemoryCache.delete(`${key}:meta`);
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.inMemoryCache.size,
      keys: Array.from(this.inMemoryCache.keys()),
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.inMemoryCache.entries()) {
      if (now > cached.expiry) {
        this.inMemoryCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const intelligentCache = new IntelligentCache();

// Cleanup expired entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      intelligentCache.cleanup();
    },
    10 * 60 * 1000
  );
}
