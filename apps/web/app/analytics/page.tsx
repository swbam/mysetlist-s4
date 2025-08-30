import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { LoadingSpinner } from "@repo/design-system";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system";
import React, { Suspense, lazy } from "react";

// Lazy load heavy analytics components for better bundle splitting
const AnalyticsOverview = lazy(() =>
  import("~/components/analytics/analytics-overview").then((m) => ({
    default: m.AnalyticsOverview,
  })),
);
const AnalyticsCharts = lazy(() =>
  import("~/components/analytics/analytics-charts").then((m) => ({
    default: m.AnalyticsCharts,
  })),
);
const AnalyticsTable = lazy(() =>
  import("~/components/analytics/analytics-table").then((m) => ({
    default: m.AnalyticsTable,
  })),
);
const RealTimeMetrics = lazy(() =>
  import("~/components/analytics/real-time-metrics").then((m) => ({
    default: m.RealTimeMetrics,
  })),
);
const UserEngagement = lazy(() =>
  import("~/components/analytics/user-engagement").then((m) => ({
    default: m.UserEngagement,
  })),
);
const PerformanceMetrics = lazy(() =>
  import("~/components/analytics/performance-metrics").then((m) => ({
    default: m.PerformanceMetrics,
  })),
);
const VotingAnalytics = lazy(() =>
  import("~/components/analytics/voting-analytics").then((m) => ({
    default: m.VotingAnalytics,
  })),
);
const RecommendationAnalytics = lazy(() =>
  import("~/components/analytics/recommendation-analytics").then((m) => ({
    default: m.RecommendationAnalytics,
  })),
);

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive insights and real-time metrics for TheSet
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Last updated:</span>
            <span className="text-sm font-medium">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Real-time metrics banner */}
        <Suspense fallback={<LoadingSpinner />}>
          <RealTimeMetrics />
        </Suspense>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <AnalyticsOverview />
            </Suspense>
            <div className="grid gap-6 md:grid-cols-2">
              <Suspense fallback={<LoadingSpinner />}>
                <AnalyticsCharts type="growth" />
              </Suspense>
              <Suspense fallback={<LoadingSpinner />}>
                <AnalyticsCharts type="engagement" />
              </Suspense>
            </div>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <UserEngagement />
            </Suspense>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Engaged Users</CardTitle>
                  <CardDescription>
                    Users with highest engagement scores this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnalyticsTable type="engaged-users" />
                  </Suspense>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Trends</CardTitle>
                  <CardDescription>
                    How user engagement is changing over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnalyticsCharts type="engagement-trends" />
                  </Suspense>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Voting Analytics Tab */}
          <TabsContent value="voting" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <VotingAnalytics />
            </Suspense>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <RecommendationAnalytics />
            </Suspense>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <PerformanceMetrics />
            </Suspense>
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Trending Artists</CardTitle>
                  <CardDescription>
                    Artists with highest trending scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnalyticsTable type="trending-artists" />
                  </Suspense>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Trending Shows</CardTitle>
                  <CardDescription>
                    Shows generating the most buzz
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnalyticsTable type="trending-shows" />
                  </Suspense>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Trending Algorithm Performance</CardTitle>
                <CardDescription>
                  How well our trending algorithm is performing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<LoadingSpinner />}>
                  <AnalyticsCharts type="trending-performance" />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>
                    New user registrations over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnalyticsCharts type="user-growth" />
                  </Suspense>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>User Retention</CardTitle>
                  <CardDescription>
                    How many users return each week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnalyticsCharts type="retention" />
                  </Suspense>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>User Segments</CardTitle>
                  <CardDescription>User behavior segmentation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnalyticsCharts type="user-segments" />
                  </Suspense>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
                <CardDescription>
                  Future revenue tracking and monetization insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground">
                  <p>
                    Revenue tracking will be implemented with monetization
                    features
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
