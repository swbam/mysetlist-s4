const cache = new Map<string, { value: any; expiry: number }>();

export class CacheService {
  private static instance: CacheService;

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get(key: string): Promise<any> {
    const item = cache.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, ttl = 3600000): Promise<void> {
    cache.set(key, { value, expiry: Date.now() + ttl });
  }

  async delete(key: string): Promise<void> {
    cache.delete(key);
  }

  async clear(): Promise<void> {
    cache.clear();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  }
}

export class CacheWarmer {
  constructor() {
    // CacheService will be used when methods are implemented
  }

  async warmCache(_keys: string[]): Promise<void> {
    // Implementation would fetch and cache data for the given keys
  }

  async warmTrendingData(): Promise<void> {
    // Implementation would fetch and cache trending data
  }

  async warmArtistData(_artistIds: string[]): Promise<void> {
    // Implementation would fetch and cache artist data
  }
}

export const cacheManager = {
  get: async (key: string) => {
    const item = cache.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    return item.value;
  },
  set: async (key: string, value: any, ttl = 3600000) => {
    cache.set(key, { value, expiry: Date.now() + ttl });
  },
  delete: async (key: string) => {
    cache.delete(key);
  },
  clear: async () => {
    cache.clear();
  },
};

export const getCacheKey = (...parts: string[]) => parts.join(":");
