"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import { Skeleton } from "@repo/design-system/skeleton";
import dynamic from "next/dynamic";

// Loading component for analytics charts
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// Lazy load the analytics charts with loading state
export const LazyAnalyticsCharts = dynamic<any>(
  () =>
    import("./analytics-charts").then((mod) => ({
      default: mod.AnalyticsCharts,
    })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Disable SSR for chart components to avoid hydration issues
  },
);

// The lazy-loaded component already provides performance benefits
