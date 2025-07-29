"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Activity, Clock, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  avgPageViews: number;
  bounceRate: number;
  retentionRate: number;
  engagementScore: number;
  userActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  cohortData: Array<{
    cohort: string;
    users: number;
    retention: number;
    engagement: number;
  }>;
  timeSpentBreakdown: Array<{
    category: string;
    minutes: number;
    percentage: number;
  }>;
}

export function UserEngagement() {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEngagementMetrics();
  }, []);

  const fetchEngagementMetrics = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/analytics?metric=engagement");
      if (!response.ok) {
        throw new Error("Failed to fetch engagement metrics");
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load engagement metrics",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading engagement metrics: {error}</p>
            <Button onClick={fetchEngagementMetrics} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          User Engagement
        </h2>
        <p className="text-muted-foreground">
          Detailed analysis of user behavior and engagement patterns
        </p>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
          <CardDescription>
            User activity across different time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.dailyActiveUsers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Daily Active Users
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(
                  (metrics.dailyActiveUsers / metrics.monthlyActiveUsers) *
                  100
                ).toFixed(1)}
                % of MAU
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.weeklyActiveUsers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Weekly Active Users
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {(
                  (metrics.weeklyActiveUsers / metrics.monthlyActiveUsers) *
                  100
                ).toFixed(1)}
                % of MAU
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.monthlyActiveUsers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Monthly Active Users
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total unique users
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.engagementScore}
              </div>
              <div className="text-sm text-muted-foreground">
                Engagement Score
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Overall user engagement
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Quality
          </CardTitle>
          <CardDescription>
            How users interact during their sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatDuration(metrics.avgSessionDuration)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Session Duration
              </div>
              <Progress
                value={metrics.avgSessionDuration * 10}
                className="mt-2"
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {metrics.avgPageViews.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Page Views
              </div>
              <Progress value={metrics.avgPageViews * 8} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {metrics.bounceRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Bounce Rate</div>
              <Progress value={100 - metrics.bounceRate} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {metrics.retentionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Retention Rate
              </div>
              <Progress value={metrics.retentionRate} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Actions
            </CardTitle>
            <CardDescription>Most common user interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.userActions.map((action, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {action.percentage.toFixed(1)}%
                    </Badge>
                    <span className="text-sm">{action.action}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {action.count.toLocaleString()}
                    </div>
                    <Progress
                      value={action.percentage}
                      className="w-20 h-2 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Spent
            </CardTitle>
            <CardDescription>Where users spend their time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.timeSpentBreakdown.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {category.percentage.toFixed(1)}%
                    </Badge>
                    <span className="text-sm">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatDuration(category.minutes)}
                    </div>
                    <Progress
                      value={category.percentage}
                      className="w-20 h-2 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Cohort Analysis
          </CardTitle>
          <CardDescription>
            How different user cohorts perform over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.cohortData.map((cohort, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{cohort.cohort}</Badge>
                    <span className="text-sm font-medium">
                      {cohort.users.toLocaleString()} users
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {cohort.retention.toFixed(1)}% retained
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Retention</span>
                      <span>{cohort.retention.toFixed(1)}%</span>
                    </div>
                    <Progress value={cohort.retention} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Engagement</span>
                      <span>{cohort.engagement.toFixed(1)}%</span>
                    </div>
                    <Progress value={cohort.engagement} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
