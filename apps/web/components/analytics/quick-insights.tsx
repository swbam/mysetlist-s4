"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Calendar,
  Music,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "~/lib/supabase/client";

interface QuickInsight {
  id: string;
  type: "trending_up" | "trending_down" | "activity" | "milestone";
  title: string;
  description: string;
  value?: string | number;
  change?: number;
  timestamp: Date;
  icon: any;
  color: string;
}

interface QuickInsightsProps {
  limit?: number;
  refreshInterval?: number;
  className?: string;
}

export function QuickInsights({
  limit = 5,
  refreshInterval = 30000, // 30 seconds
  className,
}: QuickInsightsProps) {
  const [insights, setInsights] = useState<QuickInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const generateInsights = async (): Promise<QuickInsight[]> => {
    try {
      const supabase = createClient();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent activity
      const [
        { count: recentShows },
        { count: recentVotes },
        { count: recentAttendance },
        { count: totalUsers },
        { count: totalArtists },
      ] = await Promise.all([
        supabase
          .from("shows")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneHourAgo.toISOString()),
        supabase
          .from("votes")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneHourAgo.toISOString()),
        supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneHourAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("artists").select("*", { count: "exact", head: true }),
      ]);

      const insights: QuickInsight[] = [];

      // Recent activity insights
      if (recentVotes && recentVotes > 10) {
        insights.push({
          id: "recent-votes",
          type: "activity",
          title: "High Voting Activity",
          description: `${recentVotes} votes cast in the last hour`,
          value: recentVotes,
          timestamp: now,
          icon: TrendingUp,
          color: "text-green-600",
        });
      }

      if (recentShows && recentShows > 0) {
        insights.push({
          id: "new-shows",
          type: "activity",
          title: "New Shows Added",
          description: `${recentShows} new show${recentShows !== 1 ? "s" : ""} added recently`,
          value: recentShows,
          timestamp: now,
          icon: Calendar,
          color: "text-blue-600",
        });
      }

      if (recentAttendance && recentAttendance > 5) {
        insights.push({
          id: "attendance-spike",
          type: "trending_up",
          title: "Attendance Spike",
          description: `${recentAttendance} people marked attending shows`,
          value: recentAttendance,
          timestamp: now,
          icon: Users,
          color: "text-purple-600",
        });
      }

      // Milestone insights
      if (totalUsers && totalUsers % 1000 < 50 && totalUsers > 1000) {
        insights.push({
          id: "user-milestone",
          type: "milestone",
          title: "Community Milestone",
          description: `Approaching ${Math.ceil(totalUsers / 1000) * 1000} users!`,
          value: totalUsers,
          timestamp: now,
          icon: Users,
          color: "text-orange-600",
        });
      }

      if (totalArtists && totalArtists % 500 < 25 && totalArtists > 500) {
        insights.push({
          id: "artist-milestone",
          type: "milestone",
          title: "Artist Database Growing",
          description: `Nearly ${Math.ceil(totalArtists / 500) * 500} artists tracked!`,
          value: totalArtists,
          timestamp: now,
          icon: Music,
          color: "text-pink-600",
        });
      }

      // Trending insights based on recent data
      const { data: trendingArtists } = await supabase
        .from("artists")
        .select("name, trending_score")
        .order("trending_score", { ascending: false })
        .limit(1);

      if (trendingArtists && trendingArtists.length > 0) {
        const topArtist = trendingArtists[0];
        if (topArtist?.trending_score && topArtist.trending_score > 80) {
          insights.push({
            id: "trending-artist",
            type: "trending_up",
            title: "Hot Artist Alert",
            description: `${topArtist.name ?? "Artist"} is trending with score ${topArtist.trending_score ?? 0}`,
            value: topArtist.trending_score ?? 0,
            timestamp: now,
            icon: TrendingUp,
            color: "text-red-600",
          });
        }
      }

      return insights.slice(0, limit);
    } catch (_error) {
      return [];
    }
  };

  const refreshInsights = async () => {
    setLoading(true);
    const newInsights = await generateInsights();
    setInsights(newInsights);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshInsights();

    // Set up auto-refresh
    const interval = setInterval(refreshInsights, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, limit]);

  if (loading && insights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-lg bg-muted/50 p-3"
              >
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="mb-1 h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(lastRefresh)} ago
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshInsights}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="py-6 text-center">
            <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No recent insights available
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <Icon className={`mt-0.5 h-5 w-5 ${insight.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {insight.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {insight.description}
                    </p>
                    {insight.value && (
                      <div
                        className={`mt-1 font-medium text-xs ${insight.color}`}
                      >
                        {typeof insight.value === "number"
                          ? insight.value.toLocaleString()
                          : insight.value}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
