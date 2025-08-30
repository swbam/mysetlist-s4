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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastChecked: string;
}

interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    slow: number;
    failed: number;
    total: number;
  };
  size: {
    users: number;
    shows: number;
    artists: number;
    venues: number;
  };
}

interface SecurityEvent {
  id: string;
  type:
    | "login_attempt"
    | "suspicious_activity"
    | "data_access"
    | "permission_change";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  userId?: string;
  ip_address: string;
  timestamp: string;
  resolved: boolean;
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [apiPerformance, setApiPerformance] = useState<Array<{endpoint: string, time: number, requests: number}>>([]);
  const [resourceUsage, setResourceUsage] = useState<{cpu: number, memory: number, disk: number}>({cpu: 0, memory: 0, disk: 0});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/monitoring");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      // Update system health
      setSystemHealth({
        status: data.metrics.systemStatus.toLowerCase() as "healthy" | "warning" | "critical",
        uptime: data.metrics.uptime,
        responseTime: data.metrics.averageResponseTime,
        errorRate: data.metrics.errorRate,
        lastChecked: data.lastUpdated,
      });

      // Update database metrics
      setDatabaseMetrics({
        connectionPool: data.metrics.database.connectionPool,
        queries: data.metrics.database.queries,
        size: data.metrics.database.size,
      });

      // Update security events
      setSecurityEvents(data.securityEvents || []);

      // Update API performance data
      setApiPerformance(data.metrics.apiPerformance || []);

      // Update resource usage
      setResourceUsage(data.metrics.resourceUsage || {cpu: 0, memory: 0, disk: 0});
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
      // Set fallback data on error if no data exists
      if (!systemHealth) {
        setSystemHealth({
          status: "critical",
          uptime: 0,
          responseTime: 0,
          errorRate: 100,
          lastChecked: new Date().toISOString(),
        });
      }
      if (!databaseMetrics) {
        setDatabaseMetrics({
          connectionPool: { active: 0, idle: 0, total: 0 },
          queries: { slow: 0, failed: 0, total: 0 },
          size: { users: 0, shows: 0, artists: 0, venues: 0 },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "secondary";
      case "medium":
        return "default";
      case "high":
        return "destructive";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading && !systemHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading monitoring data...</span>
      </div>
    );
  }

  if (!systemHealth || !databaseMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <span className="text-red-500">Failed to load monitoring data</span>
          <Button onClick={fetchMonitoringData} className="mt-2 block mx-auto" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">System Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time platform health and security monitoring
          </p>
        </div>
        <Button onClick={fetchMonitoringData} disabled={isLoading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">System Status</CardTitle>
            <Server
              className={`h-4 w-4 ${getStatusColor(systemHealth.status)}`}
            />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl capitalize">
              {systemHealth.status}
            </div>
            <p className="text-muted-foreground text-xs">
              Last checked:{" "}
              {format(new Date(systemHealth.lastChecked), "HH:mm:ss")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{systemHealth.uptime}%</div>
            <p className="text-muted-foreground text-xs">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {systemHealth.responseTime}ms
            </div>
            <p className="text-muted-foreground text-xs">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Error Rate</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${systemHealth.errorRate > 1 ? "text-red-500" : "text-green-500"}`}
            />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{systemHealth.errorRate}%</div>
            <p className="text-muted-foreground text-xs">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Database Monitoring */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Connection Pool
                </CardTitle>
                <CardDescription>Database connection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      Active Connections
                    </span>
                    <span className="text-sm">
                      {databaseMetrics.connectionPool.active}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      Idle Connections
                    </span>
                    <span className="text-sm">
                      {databaseMetrics.connectionPool.idle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Total Pool Size</span>
                    <span className="text-sm">
                      {databaseMetrics.connectionPool.total}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${(databaseMetrics.connectionPool.active / databaseMetrics.connectionPool.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>Database query statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Total Queries</span>
                    <span className="text-sm">
                      {databaseMetrics.queries.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Slow Queries</span>
                    <Badge
                      variant={
                        databaseMetrics.queries.slow > 5
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {databaseMetrics.queries.slow}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Failed Queries</span>
                    <Badge
                      variant={
                        databaseMetrics.queries.failed > 0
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {databaseMetrics.queries.failed}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Success Rate</span>
                    <span className="text-green-600 text-sm">
                      {(
                        ((databaseMetrics.queries.total -
                          databaseMetrics.queries.failed) /
                          databaseMetrics.queries.total) *
                        100
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Database Size</CardTitle>
              <CardDescription>Current record counts by table</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {databaseMetrics.size.users.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm">Users</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {databaseMetrics.size.shows.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm">Shows</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {databaseMetrics.size.artists.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm">Artists</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {databaseMetrics.size.venues.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-sm">Venues</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Monitoring */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Events
              </CardTitle>
              <CardDescription>
                Recent security events and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="mt-1">
                      {event.resolved ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {event.description}
                        </span>
                        <Badge
                          variant={getSeverityColor(event.severity) as any}
                        >
                          {event.severity}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-muted-foreground text-xs">
                        <div>IP: {event.ip_address}</div>
                        <div>
                          {format(
                            new Date(event.timestamp),
                            "MMM d, yyyy HH:mm:ss",
                          )}
                        </div>
                        {event.userId && <div>User: {event.userId}</div>}
                      </div>
                    </div>
                    {!event.resolved && (
                      <Button size="sm" variant="outline">
                        Investigate
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Monitoring */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Response times by endpoint</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {apiPerformance.map((api) => (
                    <div
                      key={api.endpoint}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {api.endpoint}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {api.requests} requests/hour
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{api.time}ms</div>
                        <div className="text-muted-foreground text-xs">
                          avg response
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>Server resource consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-sm">CPU Usage</span>
                      <span className="text-sm">{resourceUsage.cpu}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${resourceUsage.cpu}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-sm">Memory Usage</span>
                      <span className="text-sm">{resourceUsage.memory}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${resourceUsage.memory}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-sm">Disk Usage</span>
                      <span className="text-sm">{resourceUsage.disk}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-yellow-500"
                        style={{ width: `${resourceUsage.disk}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
