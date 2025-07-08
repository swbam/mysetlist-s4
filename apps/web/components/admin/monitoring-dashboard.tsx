'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
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
    | 'login_attempt'
    | 'suspicious_activity'
    | 'data_access'
    | 'permission_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string;
  ip_address: string;
  timestamp: string;
  resolved: boolean;
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: 99.9,
    responseTime: 245,
    errorRate: 0.1,
    lastChecked: new Date().toISOString(),
  });

  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics>({
    connectionPool: { active: 12, idle: 8, total: 20 },
    queries: { slow: 3, failed: 1, total: 15420 },
    size: { users: 1250, shows: 890, artists: 450, venues: 120 },
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, these would be separate API calls
      const [healthResponse, dbResponse, securityResponse] = await Promise.all([
        fetch(`${process.env['NEXT_PUBLIC_API_URL']}/admin/monitoring/health`),
        fetch(
          `${process.env['NEXT_PUBLIC_API_URL']}/admin/monitoring/database`
        ),
        fetch(
          `${process.env['NEXT_PUBLIC_API_URL']}/admin/monitoring/security`
        ),
      ]);

      // For now, using mock data
      // const healthData = await healthResponse.json();
      // const dbData = await dbResponse.json();
      // const securityData = await securityResponse.json();

      // Mock security events
      setSecurityEvents([
        {
          id: '1',
          type: 'login_attempt',
          severity: 'medium',
          description: 'Multiple failed login attempts from IP 192.168.1.100',
          ip_address: '192.168.1.100',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          resolved: false,
        },
        {
          id: '2',
          type: 'suspicious_activity',
          severity: 'high',
          description: 'Unusual data access pattern detected',
          user_id: 'user_123',
          ip_address: '10.0.0.45',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          resolved: true,
        },
        {
          id: '3',
          type: 'data_access',
          severity: 'low',
          description: 'Admin panel accessed from new location',
          user_id: 'admin_456',
          ip_address: '203.0.113.0',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          resolved: true,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'secondary';
      case 'medium':
        return 'default';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

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
            className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
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
              Last checked:{' '}
              {format(new Date(systemHealth.lastChecked), 'HH:mm:ss')}
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
              className={`h-4 w-4 ${systemHealth.errorRate > 1 ? 'text-red-500' : 'text-green-500'}`}
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
                          ? 'destructive'
                          : 'secondary'
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
                          ? 'destructive'
                          : 'secondary'
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
                            'MMM d, yyyy HH:mm:ss'
                          )}
                        </div>
                        {event.user_id && <div>User: {event.user_id}</div>}
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
                  {[
                    { endpoint: '/api/shows', time: 125, requests: 1240 },
                    { endpoint: '/api/artists', time: 89, requests: 890 },
                    { endpoint: '/api/venues', time: 156, requests: 670 },
                    { endpoint: '/api/users', time: 78, requests: 450 },
                  ].map((api) => (
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
                      <span className="text-sm">42%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: '42%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-sm">Memory Usage</span>
                      <span className="text-sm">68%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: '68%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-sm">Disk Usage</span>
                      <span className="text-sm">23%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-yellow-500"
                        style={{ width: '23%' }}
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
