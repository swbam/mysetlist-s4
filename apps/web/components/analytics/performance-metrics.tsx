"use client";

import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { Progress } from "@repo/design-system";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Server,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PerformanceData {
  apiMetrics: {
    totalRequests: number;
    avgResponseTime: number;
    medianResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
    uptime: number;
  };
  databaseMetrics: {
    totalQueries: number;
    avgQueryTime: number;
    slowQueries: number;
    connectionPool: number;
    cachehitRate: number;
    deadlocks: number;
  };
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    loadAverage: number;
  };
  endpoints: Array<{
    path: string;
    method: string;
    requests: number;
    avgResponseTime: number;
    errorRate: number;
    status: "healthy" | "warning" | "error";
  }>;
  errorBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
    trend: "up" | "down" | "stable";
  }>;
  performanceGoals: Array<{
    metric: string;
    target: number;
    current: number;
    status: "met" | "warning" | "missed";
  }>;
}

export function PerformanceMetrics() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);

      // Mock data - in production this would fetch from /api/analytics?metric=performance
      const mockData: PerformanceData = {
        apiMetrics: {
          totalRequests: 234567,
          avgResponseTime: 145,
          medianResponseTime: 98,
          p95ResponseTime: 320,
          p99ResponseTime: 580,
          errorRate: 0.8,
          throughput: 1234,
          uptime: 99.97,
        },
        databaseMetrics: {
          totalQueries: 156789,
          avgQueryTime: 23,
          slowQueries: 45,
          connectionPool: 85,
          cachehitRate: 94.2,
          deadlocks: 2,
        },
        systemMetrics: {
          cpuUsage: 42.5,
          memoryUsage: 68.3,
          diskUsage: 34.7,
          networkLatency: 12.5,
          loadAverage: 1.8,
        },
        endpoints: [
          {
            path: "/api/artists",
            method: "GET",
            requests: 45678,
            avgResponseTime: 89,
            errorRate: 0.2,
            status: "healthy",
          },
          {
            path: "/api/shows",
            method: "GET",
            requests: 34567,
            avgResponseTime: 156,
            errorRate: 0.5,
            status: "healthy",
          },
          {
            path: "/api/votes",
            method: "POST",
            requests: 23456,
            avgResponseTime: 234,
            errorRate: 1.2,
            status: "warning",
          },
          {
            path: "/api/search",
            method: "GET",
            requests: 19876,
            avgResponseTime: 345,
            errorRate: 0.8,
            status: "healthy",
          },
          {
            path: "/api/analytics",
            method: "GET",
            requests: 12345,
            avgResponseTime: 567,
            errorRate: 2.1,
            status: "error",
          },
          {
            path: "/api/recommendations",
            method: "GET",
            requests: 9876,
            avgResponseTime: 123,
            errorRate: 0.3,
            status: "healthy",
          },
        ],
        errorBreakdown: [
          {
            type: "4xx Client Errors",
            count: 1234,
            percentage: 65.2,
            trend: "down",
          },
          {
            type: "5xx Server Errors",
            count: 456,
            percentage: 24.1,
            trend: "stable",
          },
          {
            type: "Database Errors",
            count: 123,
            percentage: 6.5,
            trend: "down",
          },
          { type: "Timeout Errors", count: 78, percentage: 4.1, trend: "up" },
        ],
        performanceGoals: [
          {
            metric: "API Response Time",
            target: 200,
            current: 145,
            status: "met",
          },
          { metric: "Error Rate", target: 1.0, current: 0.8, status: "met" },
          { metric: "Uptime", target: 99.9, current: 99.97, status: "met" },
          {
            metric: "Cache Hit Rate",
            target: 90,
            current: 94.2,
            status: "met",
          },
          {
            metric: "Database Query Time",
            target: 50,
            current: 23,
            status: "met",
          },
          { metric: "CPU Usage", target: 70, current: 42.5, status: "met" },
        ],
      };

      setData(mockData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load performance data",
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "met":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "error":
      case "missed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "met":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "error":
      case "missed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />;
      case "stable":
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading performance metrics: {error}</p>
            <Button onClick={fetchPerformanceData} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6" />
          Performance Metrics
        </h2>
        <p className="text-muted-foreground">
          System performance and health monitoring
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              API Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg Response Time
                </span>
                <span className="font-medium">
                  {data.apiMetrics.avgResponseTime}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Error Rate
                </span>
                <span className="font-medium">
                  {data.apiMetrics.errorRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="font-medium">{data.apiMetrics.uptime}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Throughput
                </span>
                <span className="font-medium">
                  {data.apiMetrics.throughput}/s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              Database Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg Query Time
                </span>
                <span className="font-medium">
                  {data.databaseMetrics.avgQueryTime}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Cache Hit Rate
                </span>
                <span className="font-medium">
                  {data.databaseMetrics.cachehitRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Slow Queries
                </span>
                <span className="font-medium">
                  {data.databaseMetrics.slowQueries}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Connection Pool
                </span>
                <span className="font-medium">
                  {data.databaseMetrics.connectionPool}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              System Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CPU Usage</span>
                <span className="font-medium">
                  {data.systemMetrics.cpuUsage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Memory Usage
                </span>
                <span className="font-medium">
                  {data.systemMetrics.memoryUsage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Disk Usage
                </span>
                <span className="font-medium">
                  {data.systemMetrics.diskUsage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Network Latency
                </span>
                <span className="font-medium">
                  {data.systemMetrics.networkLatency}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="goals">Performance Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoint Performance</CardTitle>
              <CardDescription>
                Response times and error rates for each endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(endpoint.status)}
                        <Badge variant="outline" className="text-xs">
                          {endpoint.method}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium">{endpoint.path}</div>
                        <div className="text-sm text-muted-foreground">
                          {endpoint.requests.toLocaleString()} requests
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {endpoint.avgResponseTime}ms
                      </div>
                      <div
                        className={`text-xs ${getStatusColor(endpoint.status)}`}
                      >
                        {endpoint.errorRate}% errors
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Breakdown</CardTitle>
              <CardDescription>
                Distribution and trends of different error types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.errorBreakdown.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(error.trend)}
                        <Badge variant="outline" className="text-xs">
                          {error.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium">{error.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {error.count.toLocaleString()} occurrences
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Progress value={error.percentage} className="w-24 h-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {error.trend} trend
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>Performance Goals</CardTitle>
              <CardDescription>
                How we're performing against our targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.performanceGoals.map((goal, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(goal.status)}
                        <div>
                          <div className="font-medium">{goal.metric}</div>
                          <div className="text-sm text-muted-foreground">
                            Target: {goal.target}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{goal.current}</div>
                      <div className={`text-xs ${getStatusColor(goal.status)}`}>
                        {goal.status === "met" ? "Target met" : "Target missed"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
