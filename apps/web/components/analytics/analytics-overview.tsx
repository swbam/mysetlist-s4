"use client";

import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import {
  Activity,
  Calendar,
  Eye,
  MapPin,
  Music,
  TrendingDown,
  TrendingUp,
  Users,
  Vote,
} from "lucide-react";
import { useEffect, useState } from "react";

interface OverviewMetrics {
  totalUsers: number;
  newUsers: number;
  totalArtists: number;
  newArtists: number;
  totalShows: number;
  upcomingShows: number;
  completedShows: number;
  totalVenues: number;
  votesCast: number;
  activeVoters: number;
  newAttendances: number;
  activeVenues: number;
  userGrowthRate: number;
  engagementRate: number;
  retentionRate: number;
}

export function AnalyticsOverview() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    fetchOverviewMetrics();
  }, [period]);

  const fetchOverviewMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics?metric=overview&period=${period}`,
      );
      if (!response.ok) throw new Error("Failed to fetch metrics");

      const data = await response.json();
      setMetrics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTrendIcon = (change: number) => {
    return change > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading analytics: {error}</p>
            <Button onClick={fetchOverviewMetrics} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const metricCards = [
    {
      title: "Total Users",
      value: formatNumber(metrics.totalUsers),
      change: metrics.newUsers,
      changeLabel: `${metrics.newUsers} new this ${period}`,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Active Artists",
      value: formatNumber(metrics.totalArtists),
      change: metrics.newArtists,
      changeLabel: `${metrics.newArtists} new this ${period}`,
      icon: Music,
      color: "text-purple-500",
    },
    {
      title: "Shows",
      value: formatNumber(metrics.totalShows),
      change: metrics.upcomingShows,
      changeLabel: `${metrics.upcomingShows} upcoming`,
      icon: Calendar,
      color: "text-green-500",
    },
    {
      title: "Venues",
      value: formatNumber(metrics.totalVenues),
      change: metrics.activeVenues,
      changeLabel: `${metrics.activeVenues} active this ${period}`,
      icon: MapPin,
      color: "text-orange-500",
    },
    {
      title: "Votes Cast",
      value: formatNumber(metrics.votesCast),
      change: metrics.activeVoters,
      changeLabel: `${metrics.activeVoters} active voters`,
      icon: Vote,
      color: "text-red-500",
    },
    {
      title: "Attendance",
      value: formatNumber(metrics.newAttendances),
      change: metrics.newAttendances,
      changeLabel: `marked this ${period}`,
      icon: Eye,
      color: "text-indigo-500",
    },
    {
      title: "User Growth",
      value: formatPercentage(metrics.userGrowthRate || 0),
      change: metrics.userGrowthRate || 0,
      changeLabel: "growth rate",
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      title: "Engagement",
      value: formatPercentage(metrics.engagementRate || 0),
      change: metrics.engagementRate || 0,
      changeLabel: "engagement rate",
      icon: Activity,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="text-muted-foreground">
            Key metrics for the last {period}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={period === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("day")}
          >
            Day
          </Button>
          <Button
            variant={period === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("week")}
          >
            Week
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("month")}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getTrendIcon(metric.change)}
                  <span>{metric.changeLabel}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>
            Additional insights for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Show Completion Rate</div>
              <div className="text-2xl font-bold">
                {metrics.totalShows > 0
                  ? formatPercentage(
                      (metrics.completedShows / metrics.totalShows) * 100,
                    )
                  : "0%"}
              </div>
              <div className="text-sm text-muted-foreground">
                {metrics.completedShows} of {metrics.totalShows} shows completed
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Voting Participation</div>
              <div className="text-2xl font-bold">
                {metrics.totalUsers > 0
                  ? formatPercentage(
                      (metrics.activeVoters / metrics.totalUsers) * 100,
                    )
                  : "0%"}
              </div>
              <div className="text-sm text-muted-foreground">
                {metrics.activeVoters} of {metrics.totalUsers} users voted
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Venue Utilization</div>
              <div className="text-2xl font-bold">
                {metrics.totalVenues > 0
                  ? formatPercentage(
                      (metrics.activeVenues / metrics.totalVenues) * 100,
                    )
                  : "0%"}
              </div>
              <div className="text-sm text-muted-foreground">
                {metrics.activeVenues} of {metrics.totalVenues} venues active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
