"use client";

import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export function RealActiveShows() {
  const [activeShows, setActiveShows] = useState("0");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          setActiveShows(data.stats.activeShows);
        }
      } catch (error) {
        console.error("Failed to load active shows count:", error);
        // Use fallback on error
        setActiveShows("5+");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2"
        role="status"
        aria-label="Live statistics"
      >
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        <span className="font-medium text-sm animate-pulse">
          <span className="inline-block w-20 h-4 bg-muted rounded" />
        </span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2"
      role="status"
      aria-label="Live statistics"
    >
      <TrendingUp className="h-4 w-4" aria-hidden="true" />
      <span className="font-medium text-sm">
        Trending Now: {activeShows} Active Shows
      </span>
    </div>
  );
}
