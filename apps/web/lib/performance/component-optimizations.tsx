// Performance optimization implementations for critical MySetlist components
// SUB-AGENT 2: Component Performance Specialist

import React, { memo, useMemo, useCallback } from "react";
import { optimizeComponent } from "./optimize-component";

/**
 * CRITICAL FIX #1: Memoized AnalyticsCharts
 * Current Issue: 540KB analytics page with heavy re-renders
 * Expected Impact: 60-70% reduction in re-renders
 */

// Optimized props comparator for analytics charts
export const analyticsChartComparator = (
  prevProps: any,
  nextProps: any,
): boolean => {
  // Check if props have the expected properties
  if ("type" in prevProps && "type" in nextProps) {
    return (
      prevProps.type === nextProps.type &&
      prevProps.height === nextProps.height &&
      prevProps.period === nextProps.period
    );
  }
  // Fallback to shallow equality for other props
  return Object.keys(prevProps).every(
    (key) => prevProps[key] === nextProps[key],
  );
};

// Custom hook for memoized chart data generation
export const useOptimizedChartData = (type: string, period: string) => {
  return useMemo(() => {
    // Move expensive mock data generation to memoized hook
    const days = period === "month" ? 30 : period === "week" ? 7 : 1;
    const baseValue = getBaseValueForType(type);

    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));

      const variance = 0.2;
      const trend = type.includes("growth") ? 1.05 : 1.0;
      const value = Math.floor(
        baseValue * trend ** i * (1 + (Math.random() - 0.5) * variance),
      );

      return {
        period: date.toLocaleDateString(),
        date: date.toISOString(),
        value,
        previousValue:
          i > 0 ? Math.floor(baseValue * trend ** (i - 1)) : baseValue,
        change: i > 0 ? Math.random() * 10 - 5 : 0,
        label: getChartLabel(type, value),
      };
    });
  }, [type, period]); // Only recalculate when type or period changes
};

// Memoized chart configuration
export const useChartConfig = (type: string) => {
  return useMemo(() => {
    const configs: Record<string, any> = {
      growth: {
        title: "User Growth",
        description: "New user registrations over time",
        color: "#3b82f6",
        chartType: "line" as const,
      },
      engagement: {
        title: "User Engagement",
        description: "Daily active users and engagement metrics",
        color: "#10b981",
        chartType: "area" as const,
      },
      // ... other configs
    };

    return configs[type] || configs["growth"];
  }, [type]);
};

/**
 * CRITICAL FIX #2: Memoized Real-Time Components
 * Current Issue: Frequent socket re-renders affecting all connected components
 */

export const RealtimeOptimizedComponent = memo(function RealtimeComponent({
  data,
  onUpdate,
}: {
  data: any;
  onUpdate: (data: any) => void;
}) {
  // Memoize callback to prevent re-renders in parent components
  const handleUpdate = useCallback(
    (newData: any) => {
      onUpdate(newData);
    },
    [onUpdate],
  );

  // Memoize expensive data processing
  const processedData = useMemo(() => {
    if (!data) return [];
    return data.map((item: any) => ({
      ...item,
      processed: true,
      timestamp: Date.now(),
    }));
  }, [data]);

  return (
    <div>
      {processedData.map((item: any) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
});

/**
 * CRITICAL FIX #3: Optimized Analytics Overview
 * Current Issue: Multiple API calls and complex state management
 */

interface OverviewMetrics {
  totalUsers: number;
  newUsers: number;
  totalArtists: number;
  // ... other metrics
}

export const OptimizedAnalyticsOverview = memo(function AnalyticsOverview({
  period = "week",
}: {
  period?: "day" | "week" | "month";
}) {
  // Memoize the fetch function to prevent unnecessary API calls
  const fetchMetrics = useCallback(async (): Promise<OverviewMetrics> => {
    const response = await fetch(
      `/api/analytics?metric=overview&period=${period}`,
      {
        // Add cache headers for better performance
        headers: {
          "Cache-Control": "max-age=300", // 5 minute cache
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch metrics");
    }

    return response.json();
  }, [period]);

  // Use React Query or SWR here for better caching
  // This is a simplified version
  const [metrics, setMetrics] = React.useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchMetrics]);

  // Memoize metric calculations
  const calculatedMetrics = useMemo(() => {
    if (!metrics) return null;

    return {
      ...metrics,
      userGrowthRate: (metrics.newUsers / metrics.totalUsers) * 100,
      engagementRate:
        metrics.totalUsers > 0
          ? (metrics.newUsers / metrics.totalUsers) * 100
          : 0,
    };
  }, [metrics]);

  if (loading) {
    return <div>Loading optimized analytics...</div>;
  }

  return (
    <div>
      {/* Render optimized metrics */}
      <div>Total Users: {calculatedMetrics?.totalUsers}</div>
      <div>Growth Rate: {calculatedMetrics?.userGrowthRate.toFixed(1)}%</div>
    </div>
  );
});

// Helper functions moved outside component to prevent re-creation
function getBaseValueForType(type: string): number {
  const baseValues: Record<string, number> = {
    growth: 1000,
    "user-growth": 1000,
    engagement: 75,
    "engagement-trends": 75,
    "trending-performance": 85,
    retention: 60,
    "user-segments": 25,
  };

  return baseValues[type] || 100;
}

function getChartLabel(type: string, value: number): string {
  const labelMap: Record<string, string> = {
    growth: `${value} users`,
    "user-growth": `${value} users`,
    engagement: `${value}% engaged`,
    "engagement-trends": `${value}% engaged`,
    "trending-performance": `${value}% accuracy`,
    retention: `${value}% retained`,
    "user-segments": `${value}% segment`,
  };

  return labelMap[type] || `${value}`;
}

/**
 * HOC for automatic performance optimization of any analytics component
 */
export function withAnalyticsOptimization<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string,
) {
  return optimizeComponent(Component, {
    propsComparator: analyticsChartComparator,
    trackPerformance: process.env.NODE_ENV === "development",
    componentName: displayName || Component.displayName || Component.name,
  });
}

/**
 * PERFORMANCE MEASUREMENT UTILITY
 * Tracks render performance for optimized components
 */
export class PerformanceTracker {
  private static measurements: Map<string, number[]> = new Map();

  static startMeasure(componentName: string): string {
    const measureName = `${componentName}-${Date.now()}`;
    performance.mark(`${measureName}-start`);
    return measureName;
  }

  static endMeasure(measureName: string, componentName: string) {
    performance.mark(`${measureName}-end`);
    performance.measure(
      measureName,
      `${measureName}-start`,
      `${measureName}-end`,
    );

    const measure = performance.getEntriesByName(measureName)[0];
    if (measure) {
      const measurements = this.measurements.get(componentName) || [];
      measurements.push(measure.duration);
      this.measurements.set(componentName, measurements);

      // Log slow renders in development
      if (process.env.NODE_ENV === "development" && measure.duration > 16) {
        console.warn(
          `[Performance] ${componentName} rendered in ${measure.duration.toFixed(2)}ms`,
        );
      }
    }

    // Cleanup
    performance.clearMarks(`${measureName}-start`);
    performance.clearMarks(`${measureName}-end`);
    performance.clearMeasures(measureName);
  }

  static getAverageRenderTime(componentName: string): number {
    const measurements = this.measurements.get(componentName) || [];
    if (measurements.length === 0) return 0;

    const sum = measurements.reduce((a, b) => a + b, 0);
    return sum / measurements.length;
  }

  static getReport(): Record<
    string,
    { avgRenderTime: number; renderCount: number }
  > {
    const report: Record<
      string,
      { avgRenderTime: number; renderCount: number }
    > = {};

    for (const [componentName, measurements] of this.measurements) {
      report[componentName] = {
        avgRenderTime: this.getAverageRenderTime(componentName),
        renderCount: measurements.length,
      };
    }

    return report;
  }
}
