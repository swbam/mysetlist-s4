"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { BarChart3, Eye, Heart, Music, Users, Vote } from "lucide-react";

type ShowStatsProps = {
  show: {
    viewCount?: number;
    attendeeCount?: number;
    setlistCount?: number;
    voteCount?: number;
    trendingScore?: number;
    isFeatured?: boolean;
    isVerified?: boolean;
    status: string;
  };
};

export function ShowStats({ show }: ShowStatsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getTrendingLevel = (score: number) => {
    if (score >= 5000)
      return { level: "🔥 Hot", color: "destructive" as const };
    if (score >= 2000)
      return { level: "📈 Trending", color: "default" as const };
    if (score >= 500)
      return { level: "⚡ Rising", color: "secondary" as const };
    return { level: "🌟 New", color: "outline" as const };
  };

  const trending = getTrendingLevel(show.trendingScore || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Show Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {show.isFeatured && (
            <Badge variant="default" className="gap-1">
              <Heart className="h-3 w-3" />
              Featured
            </Badge>
          )}
          {show.isVerified && (
            <Badge variant="secondary" className="gap-1">
              ✓ Verified
            </Badge>
          )}
          <Badge variant={trending.color} className="gap-1">
            {trending.level}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              Views
            </div>
            <p className="font-semibold text-lg">
              {formatNumber(show.viewCount || 0)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Vote className="h-4 w-4" />
              Votes
            </div>
            <p className="font-semibold text-lg">
              {formatNumber(show.voteCount || 0)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Music className="h-4 w-4" />
              Setlists
            </div>
            <p className="font-semibold text-lg">{show.setlistCount || 0}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              Attendees
            </div>
            <p className="font-semibold text-lg">
              {(show.attendeeCount || 0) > 0
                ? formatNumber(show.attendeeCount || 0)
                : "TBA"}
            </p>
          </div>
        </div>

        {/* Trending Score */}
        {(show.trendingScore || 0) > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Trending Score
            </div>
            <p className="font-semibold">
              {Math.round(show.trendingScore || 0).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
