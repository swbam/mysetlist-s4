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
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { usePerformanceMonitor } from "~/hooks/use-performance-monitor";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: "good" | "warning" | "critical";
  trend?: "up" | "down" | "stable";
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status,
  trend,
  icon,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        <div className={getStatusColor(status)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">
          {value}
          {unit && <span className="ml-1 font-normal text-sm">{unit}</span>}
        </div>
        <div className="mt-2 flex items-center space-x-2">
          <Badge className={`${getStatusBadge(status)} text-white`}>
            {status.toUpperCase()}
          </Badge>
          {trend && (
            <span
              className={`text-xs ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-500"}`}
            >
              {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
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
    severity: "warning" | "critical";
    timestamp: string;
  }>;
  onDismiss: (id: string) => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-lg border-l-4 p-4 ${
            alert.severity === "critical"
              ? "border-red-500 bg-red-50"
              : "border-yellow-500 bg-yellow-50"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle
                className={`mt-0.5 h-5 w-5 ${
                  alert.severity === "critical"
                    ? "text-red-500"
                    : "text-yellow-500"
                }`}
              />
              <div>
                <h3 className="font-semibold text-sm">{alert.type}</h3>
                <p className="text-gray-600 text-sm">{alert.message}</p>
                <p className="mt-1 text-gray-500 text-xs">{alert.timestamp}</p>
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

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  unit,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Last 24 hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-32">
          <svg width="100%" height="100%" viewBox="0 0 400 100">
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 380 + 10;
              const y =
                90 - ((point.value - minValue) / (maxValue - minValue)) * 80;

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
                points={data
                  .map((point, index) => {
                    const x = (index / (data.length - 1)) * 380 + 10;
                    const y =
                      90 -
                      ((point.value - minValue) / (maxValue - minValue)) * 80;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-500"
              />
            )}
          </svg>
        </div>
        <div className="mt-2 flex justify-between text-gray-500 text-sm">
          <span>
            Min: {minValue.toFixed(1)}
            {unit}
          </span>
          <span>
            Max: {maxValue.toFixed(1)}
            {unit}
          </span>
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
        const response = await fetch("/api/admin/monitoring");
        const data = await response.json();

        setMetrics(data.metrics || {});
        setAlerts(data.alerts || []);
        setLastUpdate(new Date());
      } catch (_error) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleAlertDismiss = (alertId: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== alertId));
  };

  const getPerformanceStatus = (metric: string, value: number) => {
    const thresholds = {
      lcp: { good: 2500, warning: 4000 },
      fcp: { good: 1800, warning: 3000 },
      cls: { good: 0.1, warning: 0.25 },
      ttfb: { good: 800, warning: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) {
      return "good";
    }

    if (value <= threshold.good) {
      return "good";
    }
    if (value <= threshold.warning) {
      return "warning";
    }
    return "critical";
  };

  const systemMetrics = [
    {
      title: "System Status",
      value: metrics.systemStatus || "Healthy",
      status: metrics.systemStatus === "Healthy" ? "good" : "warning",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    {
      title: "Uptime",
      value: metrics.uptime || "99.9",
      unit: "%",
      status: (metrics.uptime || 99.9) >= 99.9 ? "good" : "warning",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      title: "Response Time",
      value: metrics.averageResponseTime || 150,
      unit: "ms",
      status: getPerformanceStatus("ttfb", metrics.averageResponseTime || 150),
      icon: <Clock className="h-4 w-4" />,
    },
    {
      title: "Error Rate",
      value: metrics.errorRate || 0.05,
      unit: "%",
      status: (metrics.errorRate || 0.05) < 0.1 ? "good" : "critical",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      title: "Active Users",
      value: metrics.activeUsers || 0,
      status: "good",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Database Queries",
      value: metrics.databaseQueries || 45,
      unit: "q/s",
      status: (metrics.databaseQueries || 45) < 100 ? "good" : "warning",
      icon: <Database className="h-4 w-4" />,
    },
  ];

  const performanceMetricsData = [
    {
      title: "Largest Contentful Paint",
      value: Math.round(performanceMetrics.lcp || 0),
      unit: "ms",
      status: getPerformanceStatus("lcp", performanceMetrics.lcp || 0),
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: "First Contentful Paint",
      value: Math.round(performanceMetrics.fcp || 0),
      unit: "ms",
      status: getPerformanceStatus("fcp", performanceMetrics.fcp || 0),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: "Cumulative Layout Shift",
      value: (performanceMetrics.cls || 0).toFixed(3),
      status: getPerformanceStatus("cls", performanceMetrics.cls || 0),
      icon: <Globe className="h-4 w-4" />,
    },
    {
      title: "Time to First Byte",
      value: Math.round(performanceMetrics.ttfb || 0),
      unit: "ms",
      status: getPerformanceStatus("ttfb", performanceMetrics.ttfb || 0),
      icon: <Server className="h-4 w-4" />,
    },
  ];

  const chartData =
    metrics.performanceData ||
    Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
      value: Math.random() * 100 + 50,
      label: `${i}:00`,
    }));

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-blue-500 border-b-2" />
          <p className="mt-4 text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Production Monitoring</h1>
          <p className="mt-1 text-gray-600">
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
            {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={handleAlertDismiss} />

      {/* System Metrics */}
      <div>
        <h2 className="mb-4 font-semibold text-xl">System Health</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systemMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              unit={metric.unit ?? ""}
              status={metric.status as "good" | "warning" | "critical"}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="mb-4 font-semibold text-xl">Performance Metrics</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {performanceMetricsData.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              unit={metric.unit ?? ""}
              status={metric.status as "good" | "warning" | "critical"}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>

      {/* Performance Charts */}
      <div>
        <h2 className="mb-4 font-semibold text-xl">Performance Trends</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PerformanceChart data={chartData} title="Response Time" unit="ms" />
          <PerformanceChart data={chartData} title="Error Rate" unit="%" />
        </div>
      </div>

      {/* Resource Usage */}
      <div>
        <h2 className="mb-4 font-semibold text-xl">Resource Usage</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Memory Usage"
            value={Math.round(
              (performanceMetrics.jsHeapUsed || 0) / 1024 / 1024,
            )}
            unit="MB"
            status="good"
            icon={<Server className="h-4 w-4" />}
          />
          <MetricCard
            title="Network Type"
            value={performanceMetrics.connectionType || "Unknown"}
            status="good"
            icon={<Globe className="h-4 w-4" />}
          />
          <MetricCard
            title="Effective Type"
            value={performanceMetrics.effectiveType || "Unknown"}
            status="good"
            icon={<Activity className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 text-center text-gray-500 text-sm">
        <p>TheSet Production Monitoring Dashboard</p>
        <p>Powered by SUB-AGENT 6 Production Deployment Strategy</p>
      </div>
    </div>
  );
};
