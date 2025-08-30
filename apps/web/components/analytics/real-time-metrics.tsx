"use client";

import { Badge } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { Activity, Eye, TrendingUp, Users, Vote, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface RealTimeData {
  activeUsers: number;
  votesLastMinute: number;
  pageViewsLastMinute: number;
  newSignupsLastHour: number;
  activeShowsCount: number;
  trending: {
    artists: Array<{ name: string; score: number }>;
    shows: Array<{ name: string; venue: string; score: number }>;
  };
}

export function RealTimeMetrics() {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchRealTimeData();

    // Update every 30 seconds
    const interval = setInterval(fetchRealTimeData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRealTimeData = async () => {
    try {
      // Mock data for now - in production this would fetch from a real-time endpoint
      const mockData: RealTimeData = {
        activeUsers: Math.floor(Math.random() * 500) + 100,
        votesLastMinute: Math.floor(Math.random() * 50) + 10,
        pageViewsLastMinute: Math.floor(Math.random() * 200) + 50,
        newSignupsLastHour: Math.floor(Math.random() * 20) + 5,
        activeShowsCount: Math.floor(Math.random() * 10) + 3,
        trending: {
          artists: [
            { name: "Taylor Swift", score: 95 },
            { name: "The Weeknd", score: 87 },
            { name: "Billie Eilish", score: 82 },
          ],
          shows: [
            { name: "Eras Tour", venue: "Madison Square Garden", score: 98 },
            { name: "After Hours", venue: "Staples Center", score: 89 },
            { name: "Happier Than Ever", venue: "Red Rocks", score: 85 },
          ],
        },
      };

      setData(mockData);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch real-time data:", error);
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const getStatusColor = (value: number, threshold: number) => {
    if (value > threshold * 1.5) return "bg-green-500";
    if (value > threshold) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Real-Time Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Live • Updated {formatTime(lastUpdate)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(data.activeUsers, 150)}`}
                />
              </div>
              <div className="text-2xl font-bold">{data.activeUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Vote className="h-4 w-4 text-purple-500" />
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(data.votesLastMinute, 20)}`}
                />
              </div>
              <div className="text-2xl font-bold">{data.votesLastMinute}</div>
              <div className="text-sm text-muted-foreground">Votes/Min</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-green-500" />
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(data.pageViewsLastMinute, 100)}`}
                />
              </div>
              <div className="text-2xl font-bold">
                {data.pageViewsLastMinute}
              </div>
              <div className="text-sm text-muted-foreground">Views/Min</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(data.newSignupsLastHour, 10)}`}
                />
              </div>
              <div className="text-2xl font-bold">
                {data.newSignupsLastHour}
              </div>
              <div className="text-sm text-muted-foreground">New Users/Hr</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-red-500" />
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(data.activeShowsCount, 5)}`}
                />
              </div>
              <div className="text-2xl font-bold">{data.activeShowsCount}</div>
              <div className="text-sm text-muted-foreground">Live Shows</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-cyan-500" />
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="text-2xl font-bold">
                {(
                  (data.votesLastMinute + data.pageViewsLastMinute) /
                  2
                ).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Activity Score
              </div>
            </div>
          </div>

          {/* Trending Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending Artists
              </h3>
              <div className="space-y-2">
                {data.trending.artists.map((artist, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm font-medium">{artist.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {artist.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Trending Shows
              </h3>
              <div className="space-y-2">
                {data.trending.shows.map((show, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="text-sm font-medium">{show.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {show.venue}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {show.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
