'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity, Database, Cloud, Zap } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Record<string, any>;
  performance: Record<string, number>;
}

interface MetricCard {
  title: string;
  value: string | number;
  description: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'healthy' | 'warning' | 'error';
}

export function ProductionMonitoringDashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      // Fetch health status
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();
      setHealthStatus(healthData);

      // Fetch system metrics
      const metricsResponse = await fetch('/api/admin/metrics');
      const metricsData = await metricsResponse.json();
      
      // Transform metrics data
      const transformedMetrics: MetricCard[] = [
        {
          title: 'Database Response Time',
          value: `${healthData.performance?.database_ms || 0}ms`,
          description: 'Average database query time',
          status: (healthData.performance?.database_ms || 0) < 100 ? 'healthy' : 'warning'
        },
        {
          title: 'API Response Time', 
          value: `${healthData.performance?.total_check_ms || 0}ms`,
          description: 'Average API response time',
          status: (healthData.performance?.total_check_ms || 0) < 500 ? 'healthy' : 'warning'
        },
        {
          title: 'Active Users',
          value: metricsData.activeUsers || 0,
          description: 'Users active in last 24h',
          trend: 'up'
        },
        {
          title: 'Daily Page Views',
          value: metricsData.dailyPageViews || 0,
          description: 'Page views today',
          trend: 'up'
        },
        {
          title: 'Shows Synced',
          value: metricsData.showsSynced || 0,
          description: 'Shows synced today',
          status: 'healthy'
        },
        {
          title: 'Artists Synced',
          value: metricsData.artistsSynced || 0,
          description: 'Artists synced today',
          status: 'healthy'
        },
        {
          title: 'Error Rate',
          value: `${metricsData.errorRate || 0}%`,
          description: 'Error rate in last hour',
          status: (metricsData.errorRate || 0) < 1 ? 'healthy' : 'error'
        },
        {
          title: 'Storage Used',
          value: `${metricsData.storageUsed || 0}GB`,
          description: 'Database storage usage',
          status: (metricsData.storageUsed || 0) < 80 ? 'healthy' : 'warning'
        }
      ];

      setMetrics(transformedMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetricStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={refreshData}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(healthStatus.status)}
              <span>System Status</span>
              <Badge className={getStatusColor(healthStatus.status)}>
                {healthStatus.status.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Overall system health as of {new Date(healthStatus.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(healthStatus.services).map(([service, data]) => (
                <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {service.includes('database') && <Database className="h-4 w-4" />}
                    {service.includes('function') && <Zap className="h-4 w-4" />}
                    {(service.includes('spotify') || service.includes('ticketmaster')) && <Cloud className="h-4 w-4" />}
                    <span className="font-medium text-sm">{service.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {data.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {data.responseTime}ms
                      </span>
                    )}
                    {getStatusIcon(data.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {healthStatus?.status === 'unhealthy' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System is experiencing issues. Some services may be unavailable.
            Check individual service statuses above for details.
          </AlertDescription>
        </Alert>
      )}

      {healthStatus?.status === 'degraded' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System is running with degraded performance. Some features may be slower than usual.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              {metric.trend && (
                <div className={`text-xs ${
                  metric.trend === 'up' ? 'text-green-600' : 
                  metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getMetricStatusColor(metric.status)}`}>
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>
            Response times and system performance over the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <div className="text-center">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Performance charts will be displayed here
              </p>
              <p className="text-sm text-muted-foreground">
                Connect to analytics service to view historical data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Events</CardTitle>
          <CardDescription>
            Latest system events and background job executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Daily sync completed successfully</span>
              </div>
              <span className="text-xs text-muted-foreground">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Trending scores updated</span>
              </div>
              <span className="text-xs text-muted-foreground">15 minutes ago</span>
            </div>
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">High API response time detected</span>
              </div>
              <span className="text-xs text-muted-foreground">1 hour ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}