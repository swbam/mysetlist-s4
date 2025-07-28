"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface MonitoringDashboardProps {
  dbStats: any;
  apiStats: any;
  errorLogs: any[];
  userActivity: any;
}

export function MonitoringDashboard({
  dbStats,
  apiStats,
  errorLogs,
  userActivity,
}: MonitoringDashboardProps) {
  const [realtimeStats, _setRealtimeStats] = useState({
    activeConnections: 0,
    requestsPerMinute: 0,
    avgResponseTime: 0,
  });

  // Calculate health score
  const healthScore = calculateHealthScore(dbStats, apiStats, errorLogs);

  return (
    <div className="space-y-8">
      {/* Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">System Health</CardTitle>
            <Activity className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{healthScore}%</div>
            <Progress value={healthScore} className="mt-2" />
            <p className="mt-2 text-muted-foreground text-xs">
              {healthScore >= 90
                ? "Healthy"
                : healthScore >= 70
                  ? "Warning"
                  : "Critical"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active Users</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {userActivity.activeUsers || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              {userActivity.trend > 0 ? (
                <span className="flex items-center text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />+{userActivity.trend}%
                  from last hour
                </span>
              ) : (
                <span className="flex items-center text-red-600">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  {userActivity.trend}% from last hour
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              API Response Time
            </CardTitle>
            <Zap className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {apiStats.avgResponseTime || 0}ms
            </div>
            <p className="text-muted-foreground text-xs">
              Average over last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{apiStats.errorRate || 0}%</div>
            <p className="text-muted-foreground text-xs">
              {
                errorLogs.filter(
                  (e) =>
                    new Date(e.created_at) > new Date(Date.now() - 3600000),
                ).length
              }{" "}
              errors in last hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {healthScore < 90 && (
        <Alert variant={healthScore < 70 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>System Health Alert</AlertTitle>
          <AlertDescription>
            {healthScore < 70
              ? "Critical issues detected. Immediate action required."
              : "System performance is degraded. Please investigate."}
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">
                      Connection Pool
                    </dt>
                    <dd className="font-medium text-sm">
                      {dbStats.activeConnections || 0} /{" "}
                      {dbStats.maxConnections || 100}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">
                      Query Performance
                    </dt>
                    <dd className="font-medium text-sm">
                      {dbStats.avgQueryTime || 0}ms avg
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">
                      Slow Queries
                    </dt>
                    <dd className="font-medium text-sm">
                      {dbStats.slowQueries || 0} (&gt;1s)
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">
                      Database Size
                    </dt>
                    <dd className="font-medium text-sm">
                      {dbStats.dbSize || "N/A"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Table Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">
                      Total Records
                    </dt>
                    <dd className="font-medium text-sm">
                      {dbStats.totalRecords || 0}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">Shows</dt>
                    <dd className="font-medium text-sm">
                      {dbStats.showCount || 0}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">Artists</dt>
                    <dd className="font-medium text-sm">
                      {dbStats.artistCount || 0}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground text-sm">Users</dt>
                    <dd className="font-medium text-sm">
                      {dbStats.userCount || 0}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(apiStats.endpoints || {}).map(
                  ([endpoint, stats]: [string, any]) => (
                    <div key={endpoint} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{endpoint}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              stats.errorRate > 5 ? "destructive" : "secondary"
                            }
                          >
                            {stats.errorRate}% errors
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            {stats.avgTime}ms avg
                          </span>
                        </div>
                      </div>
                      <Progress value={100 - stats.errorRate} className="h-2" />
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {errorLogs.slice(0, 10).map((error) => (
                  <div
                    key={error.id}
                    className="space-y-1 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="destructive">
                        {error.level || "ERROR"}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(error.created_at), "MMM d, HH:mm:ss")}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{error.message}</p>
                    {error.endpoint && (
                      <p className="text-muted-foreground text-xs">
                        Endpoint: {error.endpoint}
                      </p>
                    )}
                    {error.user_id && (
                      <p className="text-muted-foreground text-xs">
                        User: {error.user_id}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm">
                    Active Connections
                  </dt>
                  <dd className="font-medium text-sm">
                    {realtimeStats.activeConnections}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm">
                    Messages/minute
                  </dt>
                  <dd className="font-medium text-sm">
                    {realtimeStats.requestsPerMinute}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm">Avg Latency</dt>
                  <dd className="font-medium text-sm">
                    {realtimeStats.avgResponseTime}ms
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm">
                    Connection Errors
                  </dt>
                  <dd className="font-medium text-sm">0</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function calculateHealthScore(
  dbStats: any,
  apiStats: any,
  errorLogs: any[],
): number {
  let score = 100;

  // Deduct points for high error rate
  if (apiStats.errorRate > 1) {
    score -= 10;
  }
  if (apiStats.errorRate > 5) {
    score -= 20;
  }

  // Deduct points for slow response times
  if (apiStats.avgResponseTime > 500) {
    score -= 10;
  }
  if (apiStats.avgResponseTime > 1000) {
    score -= 20;
  }

  // Deduct points for database issues
  if (dbStats.slowQueries > 10) {
    score -= 15;
  }
  if (dbStats.activeConnections > dbStats.maxConnections * 0.8) {
    score -= 10;
  }

  // Deduct points for recent errors
  const recentErrors = errorLogs.filter(
    (e) => new Date(e.created_at) > new Date(Date.now() - 3600000),
  ).length;
  if (recentErrors > 10) {
    score -= 10;
  }
  if (recentErrors > 50) {
    score -= 20;
  }

  return Math.max(0, score);
}
