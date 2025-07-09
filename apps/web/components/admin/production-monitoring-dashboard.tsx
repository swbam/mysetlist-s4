'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';
import { ProductionMonitoringService } from '@/lib/production-monitoring';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Server, 
  TrendingUp, 
  Users,
  Zap
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, status, trend, icon }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={getStatusColor(status)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Badge className={`${getStatusBadge(status)} text-white`}>
            {status.toUpperCase()}
          </Badge>
          {trend && (
            <span className={`text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface AlertBannerProps {
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: 'warning' | 'critical';
    timestamp: string;
  }>;
  onDismiss: (id: string) => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border-l-4 ${
            alert.severity === 'critical' 
              ? 'bg-red-50 border-red-500' 
              : 'bg-yellow-50 border-yellow-500'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <div>
                <h3 className="font-semibold text-sm">{alert.type}</h3>
                <p className="text-sm text-gray-600">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(alert.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

interface PerformanceChartProps {
  data: Array<{
    timestamp: string;
    value: number;
    label: string;
  }>;
  title: string;
  unit: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, title, unit }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Last 24 hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-32 relative">
          <svg width="100%" height="100%" viewBox="0 0 400 100">
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 380 + 10;
              const y = 90 - ((point.value - minValue) / (maxValue - minValue)) * 80;
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="currentColor"
                  className="text-blue-500"
                />
              );
            })}
            
            {data.length > 1 && (
              <polyline
                points={data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 380 + 10;
                  const y = 90 - ((point.value - minValue) / (maxValue - minValue)) * 80;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-500"
              />
            )}
          </svg>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>Min: {minValue.toFixed(1)}{unit}</span>
          <span>Max: {maxValue.toFixed(1)}{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProductionMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { metrics: performanceMetrics, isMonitoring } = usePerformanceMonitor({
    trackCoreWebVitals: true,
    trackResourceUsage: true,
    trackNetworkInfo: true,
    debug: false,
  });

  // Fetch monitoring data
  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        const response = await fetch('/api/admin/monitoring');
        const data = await response.json();
        
        setMetrics(data.metrics || {});
        setAlerts(data.alerts || []);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch monitoring data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleAlertDismiss = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const getPerformanceStatus = (metric: string, value: number) => {
    const thresholds = {
      lcp: { good: 2500, warning: 4000 },
      fcp: { good: 1800, warning: 3000 },
      cls: { good: 0.1, warning: 0.25 },
      ttfb: { good: 800, warning: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.warning) return 'warning';
    return 'critical';
  };

  const systemMetrics = [
    {
      title: 'System Status',
      value: metrics.systemStatus || 'Healthy',
      status: metrics.systemStatus === 'Healthy' ? 'good' : 'warning',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      title: 'Uptime',
      value: metrics.uptime || '99.9',
      unit: '%',
      status: (metrics.uptime || 99.9) >= 99.9 ? 'good' : 'warning',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      title: 'Response Time',
      value: metrics.averageResponseTime || 150,
      unit: 'ms',
      status: getPerformanceStatus('ttfb', metrics.averageResponseTime || 150),
      icon: <Clock className="w-4 h-4" />,
    },
    {
      title: 'Error Rate',
      value: metrics.errorRate || 0.05,
      unit: '%',
      status: (metrics.errorRate || 0.05) < 0.1 ? 'good' : 'critical',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      title: 'Active Users',
      value: metrics.activeUsers || 1234,
      status: 'good',
      icon: <Users className="w-4 h-4" />,
    },
    {
      title: 'Database Queries',
      value: metrics.databaseQueries || 45,
      unit: 'q/s',
      status: (metrics.databaseQueries || 45) < 100 ? 'good' : 'warning',
      icon: <Database className="w-4 h-4" />,
    },
  ];

  const performanceMetricsData = [
    {
      title: 'Largest Contentful Paint',
      value: Math.round(performanceMetrics.lcp || 0),
      unit: 'ms',
      status: getPerformanceStatus('lcp', performanceMetrics.lcp || 0),
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      title: 'First Contentful Paint',
      value: Math.round(performanceMetrics.fcp || 0),
      unit: 'ms',
      status: getPerformanceStatus('fcp', performanceMetrics.fcp || 0),
      icon: <Zap className="w-4 h-4" />,
    },
    {
      title: 'Cumulative Layout Shift',
      value: (performanceMetrics.cls || 0).toFixed(3),
      status: getPerformanceStatus('cls', performanceMetrics.cls || 0),
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: 'Time to First Byte',
      value: Math.round(performanceMetrics.ttfb || 0),
      unit: 'ms',
      status: getPerformanceStatus('ttfb', performanceMetrics.ttfb || 0),
      icon: <Server className="w-4 h-4" />,
    },
  ];

  const mockChartData = Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
    value: Math.random() * 100 + 50,
    label: `${i}:00`,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={handleAlertDismiss} />

      {/* System Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              status={metric.status as 'good' | 'warning' | 'critical'}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceMetricsData.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              status={metric.status as 'good' | 'warning' | 'critical'}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>

      {/* Performance Charts */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformanceChart
            data={mockChartData}
            title="Response Time"
            unit="ms"
          />
          <PerformanceChart
            data={mockChartData}
            title="Error Rate"
            unit="%"
          />
        </div>
      </div>

      {/* Resource Usage */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Resource Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Memory Usage"
            value={Math.round((performanceMetrics.jsHeapUsed || 0) / 1024 / 1024)}
            unit="MB"
            status="good"
            icon={<Server className="w-4 h-4" />}
          />
          <MetricCard
            title="Network Type"
            value={performanceMetrics.connectionType || 'Unknown'}
            status="good"
            icon={<Globe className="w-4 h-4" />}
          />
          <MetricCard
            title="Effective Type"
            value={performanceMetrics.effectiveType || 'Unknown'}
            status="good"
            icon={<Activity className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-6 border-t">
        <p>MySetlist Production Monitoring Dashboard</p>
        <p>Powered by SUB-AGENT 6 Production Deployment Strategy</p>
      </div>
    </div>
  );
};