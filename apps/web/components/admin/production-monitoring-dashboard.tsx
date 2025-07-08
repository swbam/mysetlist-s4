'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Activity, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

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
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();
      setHealthStatus(healthData);

      const metricsResponse = await fetch('/api/admin/metrics');
      const metricsData = await metricsResponse.json();

      const transformedMetrics: MetricCard[] = [
        {
          title: 'Database Response Time',
          value: `${healthData.performance?.database_ms || 0}ms`,
          description: 'Average database query time',
          status:
            (healthData.performance?.database_ms || 0) < 100
              ? 'healthy'
              : 'warning',
        },
        {
          title: 'API Response Time',
          value: `${healthData.performance?.total_check_ms || 0}ms`,
          description: 'Average API response time',
          status:
            (healthData.performance?.total_check_ms || 0) < 500
              ? 'healthy'
              : 'warning',
        },
        {
          title: 'Active Users',
          value: metricsData.activeUsers || 0,
          description: 'Users active in last 24h',
          trend: 'up',
        },
        {
          title: 'Daily Page Views',
          value: metricsData.pageViews || 0,
          description: 'Page views today',
          trend: 'up',
        },
      ];

      setMetrics(transformedMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">Production Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <p className="text-muted-foreground text-sm">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${getStatusColor(healthStatus?.status || 'unhealthy')}`}
              />
              <Badge
                variant={
                  healthStatus?.status === 'healthy' ? 'default' : 'destructive'
                }
              >
                {healthStatus?.status?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
            <div className="text-muted-foreground text-sm">
              {healthStatus?.timestamp
                ? `Checked at ${new Date(healthStatus.timestamp).toLocaleTimeString()}`
                : 'Status unknown'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {metric.title}
              </CardTitle>
              {metric.trend && (
                <div
                  className={`text-xs ${
                    metric.trend === 'up'
                      ? 'text-green-600'
                      : metric.trend === 'down'
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}
                >
                  {metric.trend === 'up'
                    ? '↗'
                    : metric.trend === 'down'
                      ? '↘'
                      : '→'}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`font-bold text-2xl ${getMetricStatusColor(metric.status)}`}
              >
                {metric.value}
              </div>
              <p className="text-muted-foreground text-xs">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Performance Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/20">
            <p className="text-muted-foreground">
              Performance chart would go here
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border p-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">High API response time detected</span>
              </div>
              <span className="text-muted-foreground text-xs">1 hour ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
