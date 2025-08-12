"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  BarChart3,
  Calendar,
  MapPin,
  Music,
  TrendingUp,
  Users,
  Vote,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TrendingStats {
  totalVotes: number;
  totalShows: number;
  totalSetlists: number;
  totalUsers: number;
  weeklyVotes: number;
  weeklyShows: number;
  weeklyUsers: number;
  mostActiveCity: string;
  averageSetlistLength: number;
  topGenre: string;
}

export function TrendingStatistics() {
  const [stats, setStats] = useState<TrendingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/trending/insights?type=stats");
      if (!response.ok) {
        throw new Error("Failed to fetch trending statistics");
      }

      const result = await response.json();
      setStats(result.data.stats);
    } catch (err) {
      setError("Failed to load statistics");
      console.error("Error fetching trending stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {error || "No statistics available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      title: "Total Votes",
      value: stats.totalVotes,
      weeklyValue: stats.weeklyVotes,
      icon: Vote,
      color: "text-green-500",
      description: "Community votes cast",
    },
    {
      title: "Shows Tracked",
      value: stats.totalShows,
      weeklyValue: stats.weeklyShows,
      icon: Calendar,
      color: "text-blue-500",
      description: "Concerts in database",
    },
    {
      title: "Active Users",
      value: stats.totalUsers,
      weeklyValue: stats.weeklyUsers,
      icon: Users,
      color: "text-purple-500",
      description: "Registered members",
    },
    {
      title: "Setlists Created",
      value: stats.totalSetlists,
      weeklyValue: 0,
      icon: Music,
      color: "text-orange-500",
      description: "User-generated setlists",
    },
    {
      title: "Most Active City",
      value: 0,
      weeklyValue: 0,
      icon: MapPin,
      color: "text-red-500",
      description: stats.mostActiveCity,
      customValue: stats.mostActiveCity,
    },
    {
      title: "Avg Setlist Length",
      value: 0,
      weeklyValue: 0,
      icon: BarChart3,
      color: "text-indigo-500",
      description: "Songs per setlist",
      customValue: `${stats.averageSetlistLength} songs`,
    },
    {
      title: "Top Genre",
      value: 0,
      weeklyValue: 0,
      icon: TrendingUp,
      color: "text-pink-500",
      description: "Most popular genre",
      customValue: stats.topGenre,
    },
    {
      title: "Weekly Growth",
      value: 0,
      weeklyValue: stats.weeklyVotes + stats.weeklyShows + stats.weeklyUsers,
      icon: TrendingUp,
      color: "text-emerald-500",
      description: "New activity this week",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.customValue || formatNumber(item.value + item.weeklyValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {item.description}
            </p>
            {item.weeklyValue > 0 && !item.customValue && (
              <p className="text-xs text-green-600 mt-1">
                +{formatNumber(item.weeklyValue)} this week
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
