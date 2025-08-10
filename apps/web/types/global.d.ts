declare global {
  interface Window {
    __cacheManager?: {
      clearTrendingCache?: () => Promise<void>;
      refreshTrendingData?: () => Promise<void>;
      clearStaleCaches?: () => Promise<void>;
      lastRefresh?: Date | null;
      isRegistered?: boolean;
      clearCache?: () => Promise<void>;
      clearServiceWorkerCache?: () => Promise<void>;
      status?: {
        lastClearTime: Date | null;
        serviceWorkerActive: boolean;
        cacheCleared: boolean;
      };
      debug?: {
        logCacheOperations: boolean;
      };
    };
    clearMySetlistCache?: () => Promise<void>;
  }
}

export {};
