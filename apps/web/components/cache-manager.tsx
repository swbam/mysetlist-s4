"use client";

import { useCallback, useEffect, useState } from "react";
import { useServiceWorker } from "~/hooks/use-service-worker";

interface CacheManagerProps {
  children?: React.ReactNode;
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
}

export function CacheManager({
  children,
  enableAutoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
}: CacheManagerProps) {
  const {
    isSupported,
    isRegistered,
    register,
    clearTrendingCache,
    refreshTrendingData,
    clearStaleCaches,
  } = useServiceWorker();

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    if (isSupported && !isRegistered) {
      register().then(() => {
        console.log("[CacheManager] Service worker registered");
      });
    }
  }, [isSupported, isRegistered, register]);

  // Clear stale caches on first load
  useEffect(() => {
    if (isSupported && !cacheCleared) {
      clearStaleCaches().then(() => {
        setCacheCleared(true);
        console.log("[CacheManager] Stale caches cleared");
      });
    }
  }, [isSupported, clearStaleCaches, cacheCleared]);

  // Auto-refresh trending data
  const refreshTrending = useCallback(async () => {
    if (!isSupported) return;

    try {
      await refreshTrendingData();
      setLastRefresh(new Date());
      console.log("[CacheManager] Trending data refreshed");
    } catch (error) {
      console.warn("[CacheManager] Failed to refresh trending data:", error);
    }
  }, [isSupported, refreshTrendingData]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!enableAutoRefresh || !isSupported) {
      return;
    }

    const interval = setInterval(refreshTrending, refreshInterval);
    return () => clearInterval(interval);
  }, [enableAutoRefresh, isSupported, refreshTrending, refreshInterval]);

  // Clear API cache when page becomes visible (user returns to tab)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh trending data
        refreshTrending();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSupported, refreshTrending]);

  // Expose cache management functions globally for debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__cacheManager = {
        clearTrendingCache,
        refreshTrendingData,
        clearStaleCaches,
        lastRefresh,
        isRegistered,
      };
    }

    return () => {
      if (typeof window !== "undefined") {
        window.__cacheManager = undefined;
      }
    };
  }, [
    clearTrendingCache,
    refreshTrendingData,
    clearStaleCaches,
    lastRefresh,
    isRegistered,
  ]);

  return (
    <>
      {children}
      {/* Add a hidden div that displays cache status in dev mode */}
      {process.env['NODE_ENV'] === "development" && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "4px 8px",
            fontSize: "10px",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          SW: {isRegistered ? "OK" : "NO"} | Cache:{" "}
          {cacheCleared ? "CLEAN" : "DIRTY"} | Last:{" "}
          {lastRefresh?.toLocaleTimeString() || "NEVER"}
        </div>
      )}
    </>
  );
}

// Standalone function to clear all caches (useful for debugging)
export async function clearAllCaches() {
  if (!("caches" in window)) {
    console.warn("Cache API not supported");
    return;
  }

  try {
    const cacheNames = await caches.keys();
    console.log("[Cache] Found caches:", cacheNames);

    await Promise.all(
      cacheNames.map((name) => {
        console.log("[Cache] Deleting cache:", name);
        return caches.delete(name);
      }),
    );

    console.log("[Cache] All caches cleared");

    // Also clear localStorage cache data
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("theset-") || key.includes("trending")) {
          localStorage.removeItem(key);
        }
      });
    }

    // Reload the page to ensure fresh data
    window.location.reload();
  } catch (error) {
    console.error("[Cache] Failed to clear caches:", error);
  }
}

// Add global function for easy cache clearing in production
if (typeof window !== "undefined") {
  window.clearTheSetCache = clearAllCaches;
}
