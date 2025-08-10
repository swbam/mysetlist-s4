"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Eye,
  MapPin,
  Music,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TableProps {
  type:
    | "engaged-users"
    | "trending-artists"
    | "trending-shows"
    | "top-venues"
    | "recent-activity";
  limit?: number;
}

interface TableRow {
  id: string;
  name: string;
  avatar?: string;
  subtitle?: string;
  metric?: number;
  metricLabel?: string;
  secondaryMetric?: number;
  secondaryLabel?: string;
  trend?: "up" | "down" | "stable";
  status?: "active" | "inactive" | "pending";
  location?: string;
  type?: string;
  lastActive?: string;
}

export function AnalyticsTable({ type, limit = 10 }: TableProps) {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTableData();
  }, [type, limit]);

  const fetchTableData = async () => {
    try {
      setLoading(true);

      // Mock data based on table type
      const mockData = generateMockData(type, limit);
      setData(mockData);

      // In production, this would be:
      // const response = await fetch(`/api/analytics/table?type=${type}&limit=${limit}`);
      // const result = await response.json();
      // setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load table data",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (
    tableType: string,
    itemLimit: number,
  ): TableRow[] => {
    // Do not generate mock data in production
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      return [];
    }
    switch (tableType) {
      case "engaged-users":
        return Array.from({ length: itemLimit }, (_, i) => ({
          id: `user-${i}`,
          name: `User ${i + 1}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
          subtitle: `Active since ${new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
          metric: Math.floor(Math.random() * 1000) + 100,
          metricLabel: "actions",
          secondaryMetric: Math.floor(Math.random() * 50) + 10,
          secondaryLabel: "sessions",
          trend: Math.random() > 0.5 ? "up" : "down",
          status: Math.random() > 0.3 ? "active" : "inactive",
          lastActive: `${Math.floor(Math.random() * 24)} hours ago`,
        }));

      case "trending-artists":
        const artists = [
          "Taylor Swift",
          "The Weeknd",
          "Billie Eilish",
          "Post Malone",
          "Harry Styles",
          "Ariana Grande",
          "Ed Sheeran",
          "Drake",
          "Dua Lipa",
          "Olivia Rodrigo",
        ];
        return Array.from(
          { length: Math.min(itemLimit, artists.length) },
          (_, i) => ({
            id: `artist-${i}`,
            name: artists[i] ?? "",
            avatar: `https://api.dicebear.com/7.x/personas/svg?seed=${artists[i] ?? ""}`,
            subtitle: `${Math.floor(Math.random() * 50) + 10} upcoming shows`,
            metric: Math.floor(Math.random() * 100) + 50,
            metricLabel: "trending score",
            secondaryMetric: Math.floor(Math.random() * 10000) + 1000,
            secondaryLabel: "followers",
            trend:
              Math.random() > 0.7
                ? "up"
                : Math.random() > 0.3
                  ? "stable"
                  : "down",
            type: "Pop",
            location: "Global",
          }),
        );

      case "trending-shows":
        const shows = [
          "Eras Tour",
          "After Hours Til Dawn",
          "Happier Than Ever",
          "Love On Tour",
          "Sweetener World Tour",
        ];
        const venues = [
          "Madison Square Garden",
          "Staples Center",
          "Wembley Stadium",
          "Red Rocks",
          "The Forum",
        ];
        return Array.from(
          { length: Math.min(itemLimit, shows.length) },
          (_, i) => ({
            id: `show-${i}`,
            name: shows[i] ?? "",
            subtitle: venues[i] ?? "",
            metric: Math.floor(Math.random() * 100) + 60,
            metricLabel: "buzz score",
            secondaryMetric: Math.floor(Math.random() * 5000) + 1000,
            secondaryLabel: "votes",
            trend:
              Math.random() > 0.6
                ? "up"
                : Math.random() > 0.3
                  ? "stable"
                  : "down",
            type: "Concert",
            location: "New York, NY",
            lastActive: `${Math.floor(Math.random() * 7)} days ago`,
          }),
        );

      case "top-venues":
        const venueNames = [
          "Madison Square Garden",
          "Staples Center",
          "Wembley Stadium",
          "Red Rocks Amphitheatre",
          "The Forum",
        ];
        const cities = [
          "New York, NY",
          "Los Angeles, CA",
          "London, UK",
          "Morrison, CO",
          "Inglewood, CA",
        ];
        return Array.from(
          { length: Math.min(itemLimit, venueNames.length) },
          (_, i) => ({
            id: `venue-${i}`,
            name: venueNames[i] ?? "",
            subtitle: cities[i] ?? "",
            metric: Math.floor(Math.random() * 100) + 30,
            metricLabel: "popularity",
            secondaryMetric: Math.floor(Math.random() * 50) + 10,
            secondaryLabel: "shows",
            trend: Math.random() > 0.5 ? "up" : "down",
            type: "Arena",
            location: cities[i] ?? "",
          }),
        );

      case "recent-activity":
        const activities = [
          "Voted on song",
          "Followed artist",
          "Attended show",
          "Created setlist",
          "Shared show",
        ];
        return Array.from({ length: itemLimit }, (_, i) => ({
          id: `activity-${i}`,
          name: `User ${i + 1}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
          subtitle:
            activities[Math.floor(Math.random() * activities.length)] ?? "",
          lastActive: `${Math.floor(Math.random() * 60)} minutes ago`,
          type: "User Activity",
          status: "active",
        }));

      default:
        return [];
    }
  };

  const getTableHeaders = () => {
    switch (type) {
      case "engaged-users":
        return ["User", "Engagement", "Status", "Last Active"];
      case "trending-artists":
        return ["Artist", "Trending Score", "Followers", "Trend"];
      case "trending-shows":
        return ["Show", "Venue", "Buzz Score", "Votes"];
      case "top-venues":
        return ["Venue", "Location", "Popularity", "Shows"];
      case "recent-activity":
        return ["User", "Activity", "Time"];
      default:
        return ["Name", "Metric", "Secondary", "Status"];
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "stable":
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            Active
          </Badge>
        );
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (itemType: string) => {
    switch (itemType) {
      case "Pop":
      case "Concert":
        return <Music className="h-4 w-4" />;
      case "Arena":
        return <MapPin className="h-4 w-4" />;
      case "User Activity":
        return <User className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(limit)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded animate-pulse"
          >
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-8">
        <p>Error loading data: {error}</p>
        <Button onClick={fetchTableData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const headers = getTableHeaders();

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {row.avatar && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={row.avatar} alt={row.name} />
                      <AvatarFallback>{row.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div className="font-medium">{row.name}</div>
                    {row.subtitle && (
                      <div className="text-sm text-muted-foreground">
                        {row.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>

              {type === "engaged-users" && (
                <>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {row.metric} {row.metricLabel}
                      </div>
                      <div className="text-muted-foreground">
                        {row.secondaryMetric} {row.secondaryLabel}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.status && getStatusBadge(row.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {row.lastActive}
                    </div>
                  </TableCell>
                </>
              )}

              {type === "trending-artists" && (
                <>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.metric}</span>
                      {row.trend && getTrendIcon(row.trend)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {row.secondaryMetric?.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.type && getTypeIcon(row.type)}
                      <span className="text-sm">{row.type}</span>
                    </div>
                  </TableCell>
                </>
              )}

              {type === "trending-shows" && (
                <>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {row.subtitle}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.metric}</span>
                      {row.trend && getTrendIcon(row.trend)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {row.secondaryMetric?.toLocaleString()}
                    </span>
                  </TableCell>
                </>
              )}

              {type === "top-venues" && (
                <>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {row.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.metric}%</span>
                      {row.trend && getTrendIcon(row.trend)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{row.secondaryMetric}</span>
                  </TableCell>
                </>
              )}

              {type === "recent-activity" && (
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {row.lastActive}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
