"use client";

import { useEffect, useState } from "react";

interface AboutStats {
  activeUsers: string;
  artistsTracked: string;
  showsCovered: string;
}

export function AboutStats() {
  const [stats, setStats] = useState<AboutStats>({
    activeUsers: "0",
    artistsTracked: "0", 
    showsCovered: "0",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          // Map stats API response to about page format
          setStats({
            activeUsers: data.stats.musicFans,
            artistsTracked: data.stats.activeArtists,
            showsCovered: data.stats.activeShows,
          });
        }
      } catch (error) {
        console.error("Failed to load about stats:", error);
        // Use fallback stats on error
        setStats({
          activeUsers: "10+",
          artistsTracked: "5+",
          showsCovered: "5+",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
        <div>
          <div className="font-bold text-3xl text-primary animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mx-auto"></div>
          </div>
          <div className="text-muted-foreground">Active Users</div>
        </div>
        <div>
          <div className="font-bold text-3xl text-primary animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mx-auto"></div>
          </div>
          <div className="text-muted-foreground">Artists Tracked</div>
        </div>
        <div>
          <div className="font-bold text-3xl text-primary animate-pulse">
            <div className="h-8 w-16 bg-muted rounded mx-auto"></div>
          </div>
          <div className="text-muted-foreground">Shows Covered</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
      <div>
        <div className="font-bold text-3xl text-primary">{stats.activeUsers}</div>
        <div className="text-muted-foreground">Active Users</div>
      </div>
      <div>
        <div className="font-bold text-3xl text-primary">{stats.artistsTracked}</div>
        <div className="text-muted-foreground">Artists Tracked</div>
      </div>
      <div>
        <div className="font-bold text-3xl text-primary">{stats.showsCovered}</div>
        <div className="text-muted-foreground">Shows Covered</div>
      </div>
    </div>
  );
}