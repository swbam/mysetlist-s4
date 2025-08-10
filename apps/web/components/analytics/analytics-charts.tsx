"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Eye, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartData {
  period: string;
  date: string;
  value: number;
  previousValue?: number;
  change?: number;
  label?: string;
}

interface ChartProps {
  type:
    | "growth"
    | "engagement"
    | "engagement-trends"
    | "trending-performance"
    | "user-growth"
    | "retention"
    | "user-segments";
  height?: number;
  period?: "day" | "week" | "month";
}

export function AnalyticsCharts({
  type,
  height = 300,
  period = "week",
}: ChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, [type, period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);

      // Mock data generation based on chart type
      const mockData = generateMockData(type, period);
      setData(mockData);

      // In production, this would be:
      // const response = await fetch(`/api/analytics?metric=${type}&period=${period}&groupBy=day`);
      // const result = await response.json();
      // setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load chart data",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (
    chartType: string,
    periodType: string,
  ): ChartData[] => {
    const days = periodType === "month" ? 30 : periodType === "week" ? 7 : 1;
    const baseValue = getBaseValue(chartType);

    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));

      const variance = 0.2; // 20% variance
      const trend = chartType.includes("growth") ? 1.05 : 1.0; // 5% growth for growth charts
      const value = Math.floor(
        baseValue * trend ** i * (1 + (Math.random() - 0.5) * variance),
      );

      return {
        period: date.toLocaleDateString(),
        date: date.toISOString(),
        value,
        previousValue:
          i > 0
            ? Math.floor(
                baseValue *
                  trend ** (i - 1) *
                  (1 + (Math.random() - 0.5) * variance),
              )
            : baseValue,
        change: i > 0 ? Math.random() * 10 - 5 : 0,
        label: getChartLabel(chartType, value),
      };
    });
  };

  const getBaseValue = (chartType: string): number => {
    switch (chartType) {
      case "growth":
      case "user-growth":
        return 1000;
      case "engagement":
      case "engagement-trends":
        return 75;
      case "trending-performance":
        return 85;
      case "retention":
        return 60;
      case "user-segments":
        return 25;
      default:
        return 100;
    }
  };

  const getChartLabel = (chartType: string, value: number): string => {
    switch (chartType) {
      case "growth":
      case "user-growth":
        return `${value} users`;
      case "engagement":
      case "engagement-trends":
        return `${value}% engaged`;
      case "trending-performance":
        return `${value}% accuracy`;
      case "retention":
        return `${value}% retained`;
      case "user-segments":
        return `${value}% segment`;
      default:
        return `${value}`;
    }
  };

  const getChartConfig = (chartType: string) => {
    switch (chartType) {
      case "growth":
        return {
          title: "User Growth",
          description: "New user registrations over time",
          color: "#3b82f6",
          icon: TrendingUp,
          chartType: "line" as const,
        };
      case "engagement":
        return {
          title: "User Engagement",
          description: "Daily active users and engagement metrics",
          color: "#10b981",
          icon: Users,
          chartType: "area" as const,
        };
      case "engagement-trends":
        return {
          title: "Engagement Trends",
          description: "How engagement changes over time",
          color: "#f59e0b",
          icon: Eye,
          chartType: "bar" as const,
        };
      case "trending-performance":
        return {
          title: "Trending Algorithm",
          description: "Algorithm accuracy and performance",
          color: "#ef4444",
          icon: TrendingUp,
          chartType: "line" as const,
        };
      case "user-growth":
        return {
          title: "User Growth Rate",
          description: "Growth rate percentage over time",
          color: "#8b5cf6",
          icon: TrendingUp,
          chartType: "area" as const,
        };
      case "retention":
        return {
          title: "User Retention",
          description: "Percentage of users returning",
          color: "#06b6d4",
          icon: Users,
          chartType: "bar" as const,
        };
      case "user-segments":
        return {
          title: "User Segments",
          description: "Distribution of user behavior types",
          color: "#84cc16",
          icon: Users,
          chartType: "pie" as const,
        };
      default:
        return {
          title: "Analytics Chart",
          description: "Chart description",
          color: "#6b7280",
          icon: TrendingUp,
          chartType: "line" as const,
        };
    }
  };

  const config = getChartConfig(type);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <config.icon className="h-5 w-5" />
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-[300px] bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <config.icon className="h-5 w-5" />
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive py-8">
            <p>Error loading chart: {error}</p>
            <Button onClick={fetchChartData} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    if (config.chartType === "pie") {
      const pieData = [
        { name: "Power Users", value: 25, color: "#3b82f6" },
        { name: "Regular Users", value: 45, color: "#10b981" },
        { name: "Casual Users", value: 30, color: "#f59e0b" },
      ];

      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (config.chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill={config.color} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (config.chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              fill={config.color}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default to line chart
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={config.color}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const getCurrentValue = () => {
    return data.length > 0 ? (data[data.length - 1]?.value ?? 0) : 0;
  };

  const getTrend = () => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1]?.value ?? 0;
    const previous = data[data.length - 2]?.value ?? 0;
    return ((current - previous) / previous) * 100;
  };

  const trend = getTrend();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <config.icon
                className="h-5 w-5"
                style={{ color: config.color }}
              />
              {config.title}
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {getCurrentValue().toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={trend > 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}
