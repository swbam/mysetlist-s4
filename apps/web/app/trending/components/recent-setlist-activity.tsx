"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/avatar";
import { Badge } from "@repo/design-system/badge";
import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import { Skeleton } from "@repo/design-system/skeleton";
import { Calendar, Clock, Music, Users, Vote } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface RecentSetlistActivity {
  id: string;
  type: "new_vote" | "new_setlist" | "show_update";
  showName: string;
  showSlug: string;
  artistName: string;
  artistSlug: string;
  venueName: string;
  venueCity: string;
  date: string;
  createdAt: string;
  metadata?: {
    songTitle?: string;
    voteCount?: number;
    setlistCount?: number;
  };
}

export function RecentSetlistActivity() {
  const [activities, setActivities] = useState<RecentSetlistActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const response = await fetch(
        "/api/trending/insights?type=activity&limit=12",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch recent activity");
      }

      const result = await response.json();
      setActivities(result.data.activity || []);
    } catch (err) {
      setError("Failed to load recent activity");
      console.error("Error fetching recent activity:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "new_vote":
        return <Vote className="h-3 w-3" />;
      case "new_setlist":
        return <Music className="h-3 w-3" />;
      case "show_update":
        return <Calendar className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "new_vote":
        return "text-green-500";
      case "new_setlist":
        return "text-blue-500";
      case "show_update":
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  const getActivityText = (activity: RecentSetlistActivity) => {
    const { type, metadata } = activity;

    switch (type) {
      case "new_vote":
        return metadata?.songTitle
          ? `voted for "${metadata.songTitle}"`
          : "cast a vote";
      case "new_setlist":
        return "created a new setlist";
      case "show_update":
        return "updated show details";
      default:
        return "had activity";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) {
      return "just now";
    }
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest setlist votes and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
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
            <Clock className="h-5 w-5 text-blue-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground text-sm">{error}</p>
            <Button onClick={fetchActivity} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest setlist votes and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0"
            >
              {/* Activity Icon */}
              <div className={`mt-1 ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {activity.type.replace("_", " ")}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  Someone {getActivityText(activity)} at{" "}
                  <Link
                    href={`/shows/${activity.showSlug}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {activity.showName}
                  </Link>
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Link
                    href={`/artists/${activity.artistSlug}`}
                    className="hover:underline hover:text-foreground"
                  >
                    {activity.artistName}
                  </Link>
                  <span>•</span>
                  <span>
                    {activity.venueName}, {activity.venueCity}
                  </span>
                  <span>•</span>
                  <span>{formatTimeAgo(activity.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More Link */}
        <div className="mt-6 text-center">
          <Link
            href="/activity"
            className="text-sm text-primary hover:underline"
          >
            View all activity →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
