"use client";

import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
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
import { cn } from "@repo/design-system";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Gauge,
  MemoryStick,
  Monitor,
  Smartphone,
  TrendingUp,
  Wifi,
  Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { usePerformanceMonitor } from "~/hooks/use-performance-monitor";

interface PerformanceDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
  onMetricAlert?: (metric: string, value: number, threshold: number) => void;
}

// Performance thresholds based on Google's recommendations
const PERFORMANCE_THRESHOLDS = {
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
  memory: { good: 50, poor: 80 }, // MB
};

// Metric component
const MetricCard = memo(function MetricCard({
  title,
  value,
  unit,
  threshold,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: number | undefined;
  unit: string;
  threshold: { good: number; poor: number };
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  trend?: "up" | "down" | "stable";
}) {
  const getStatus = useCallback(
    (val: number) => {
      if (val <= threshold.good) return "good";
      if (val <= threshold.poor) return "needs-improvement";
      return "poor";
    },
    [threshold],
  );

  const status = value ? getStatus(value) : "unknown";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {trend && (
              <TrendingUp
                className={cn(
                  "h-3 w-3",
                  trend === "up"
                    ? "text-green-500"
                    : trend === "down"
                      ? "text-red-500"
                      : "text-gray-500",
                )}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">
              {value ? value.toFixed(1) : "--"}
            </span>
            <span className="text-sm text-muted-foreground">{unit}</span>
            <Badge
              variant={status === "good" ? "default" : "destructive"}
              className="ml-auto"
            >
              {status}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Good</span>
              <span>Poor</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-green-500"
                style={{
                  width: `${(threshold.good / (threshold.poor * 1.2)) * 100}%`,
                }}
              />
              <div
                className="absolute top-0 h-full bg-yellow-500"
                style={{
                  left: `${(threshold.good / (threshold.poor * 1.2)) * 100}%`,
                  width: `${((threshold.poor - threshold.good) / (threshold.poor * 1.2)) * 100}%`,
                }}
              />
              {value && (
                <div
                  className="absolute top-0 w-1 h-full bg-gray-800"
                  style={{
                    left: `${Math.min((value / (threshold.poor * 1.2)) * 100, 100)}%`,
                  }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}) as any;

// Network information component
const NetworkInfo = memo(function NetworkInfo({
  connectionType,
  downlink,
  effectiveType,
}: {
  connectionType?: string;
  downlink?: number;
  effectiveType?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center">
          <Wifi className="h-4 w-4 mr-2" />
          Network Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Connection Type:</span>
          <Badge variant="outline">{connectionType || "Unknown"}</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span>Effective Type:</span>
          <Badge variant="outline">{effectiveType || "Unknown"}</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span>Downlink:</span>
          <span>{downlink ? `${downlink} Mbps` : "Unknown"}</span>
        </div>
      </CardContent>
    </Card>
  );
}) as any;

// Memory usage component
const MemoryUsage = memo(function MemoryUsage({
  jsHeapUsed,
  jsHeapTotal,
  jsHeapLimit,
}: {
  jsHeapUsed?: number;
  jsHeapTotal?: number;
  jsHeapLimit?: number;
}) {
  const usedMB = jsHeapUsed ? jsHeapUsed / 1024 / 1024 : 0;
  const totalMB = jsHeapTotal ? jsHeapTotal / 1024 / 1024 : 0;
  const limitMB = jsHeapLimit ? jsHeapLimit / 1024 / 1024 : 0;

  const usagePercentage = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center">
          <MemoryStick className="h-4 w-4 mr-2" />
          Memory Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Used:</span>
            <span>{usedMB.toFixed(1)} MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total:</span>
            <span>{totalMB.toFixed(1)} MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Limit:</span>
            <span>{limitMB.toFixed(1)} MB</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Usage</span>
            <span>{usagePercentage.toFixed(1)}%</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
        </div>

        {usagePercentage > 80 && (
          <div className="flex items-center space-x-2 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            <span>High memory usage detected</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}) as any;

// Main dashboard component
const PerformanceDashboardComponent = function PerformanceDashboard({
  className,
  autoRefresh = true,
  refreshInterval = 5000,
  showDetailedMetrics: _showDetailedMetrics = true,
  onMetricAlert,
}: PerformanceDashboardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [alertHistory, setAlertHistory] = useState<
    Array<{
      metric: string;
      value: number;
      threshold: number;
      timestamp: Date;
    }>
  >([]);

  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getPerformanceScore,
    exportMetrics,
  } = usePerformanceMonitor({
    trackCoreWebVitals: true,
    trackResourceUsage: true,
    trackNetworkInfo: true,
    reportInterval: refreshInterval,
    onMetricUpdate: (metric, value) => {
      const threshold =
        PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS];
      if (threshold && value > threshold.poor) {
        const alert = {
          metric,
          value,
          threshold: threshold.poor,
          timestamp: new Date(),
        };
        setAlertHistory((prev) => [...prev, alert].slice(-10)); // Keep last 10 alerts
        onMetricAlert?.(metric, value, threshold.poor);
      }
    },
  });

  const performanceScore = useMemo(
    () => getPerformanceScore(),
    [getPerformanceScore],
  );

  // Toggle monitoring based on visibility
  useEffect(() => {
    if (isVisible && autoRefresh) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  }, [isVisible, autoRefresh, startMonitoring, stopMonitoring]);

  // Intersection observer for visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry?.isIntersecting ?? false),
      { threshold: 0.1 },
    );

    const dashboardRef = document.querySelector("[data-performance-dashboard]");
    if (dashboardRef) {
      observer.observe(dashboardRef);
    }

    return () => observer.disconnect();
  }, []);

  const handleExport = useCallback(() => {
    const data = exportMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportMetrics]);

  const getDeviceType = () => {
    if (typeof window === "undefined") return "unknown";
    return window.innerWidth <= 768 ? "mobile" : "desktop";
  };

  return (
    <div data-performance-dashboard className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Gauge className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? "Monitoring" : "Stopped"}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!isMonitoring}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <div className="flex items-center space-x-2">
            {getDeviceType() === "mobile" ? (
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Monitor className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {getDeviceType()}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Score */}
      {performanceScore && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Overall Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold">
                {performanceScore.overall}
              </div>
              <div className="flex-1">
                <Progress value={performanceScore.overall} className="h-3" />
              </div>
              <Badge
                variant={
                  performanceScore.overall >= 90 ? "default" : "destructive"
                }
              >
                {performanceScore.overall >= 90 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vitals">Core Vitals</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="First Contentful Paint"
              value={metrics.fcp}
              unit="ms"
              threshold={PERFORMANCE_THRESHOLDS.fcp}
              icon={Eye}
              description="Time until first content appears"
            />
            <MetricCard
              title="Largest Contentful Paint"
              value={metrics.lcp}
              unit="ms"
              threshold={PERFORMANCE_THRESHOLDS.lcp}
              icon={Monitor}
              description="Time until main content loads"
            />
            <MetricCard
              title="First Input Delay"
              value={metrics.fid}
              unit="ms"
              threshold={PERFORMANCE_THRESHOLDS.fid}
              icon={Zap}
              description="Time to first interaction"
            />
            <MetricCard
              title="Cumulative Layout Shift"
              value={metrics.cls}
              unit=""
              threshold={PERFORMANCE_THRESHOLDS.cls}
              icon={Activity}
              description="Visual stability measure"
            />
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MemoryUsage
              jsHeapUsed={metrics.jsHeapUsed}
              jsHeapTotal={metrics.jsHeapTotal}
              jsHeapLimit={metrics.jsHeapLimit}
            />
            <MetricCard
              title="Time to First Byte"
              value={metrics.ttfb}
              unit="ms"
              threshold={PERFORMANCE_THRESHOLDS.ttfb}
              icon={Clock}
              description="Server response time"
            />
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <NetworkInfo
            connectionType={metrics.connectionType}
            downlink={metrics.downlink}
            effectiveType={metrics.effectiveType}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No performance alerts
                </p>
              ) : (
                <div className="space-y-2">
                  {alertHistory.map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span>
                          {alert.metric}: {alert.value.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const PerformanceDashboard = memo(PerformanceDashboardComponent);
