"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Activity,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Heart,
  Music,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "../../components/protected-route";
import { useAuth } from "../../providers/auth-provider";

interface UserActivity {
  id: string;
  type:
    | "follow"
    | "unfollow"
    | "vote_up"
    | "vote_down"
    | "setlist_create"
    | "show_attend"
    | "show_plan";
  artistId?: string;
  artistName?: string;
  artistImage?: string;
  showId?: string;
  showName?: string;
  showDate?: string;
  venueName?: string;
  songTitle?: string;
  timestamp: string;
  description: string;
  metadata?: Record<string, any>;
}

interface ActivityStats {
  totalActivities: number;
  artistsFollowed: number;
  showsAttended: number;
  votesGiven: number;
  setlistsCreated: number;
}

export default function ActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filteredActivities, setFilteredActivities] = useState<UserActivity[]>(
    [],
  );

  useEffect(() => {
    const fetchActivity = async () => {
      if (!user?.id) {
        return;
      }

      try {
        const response = await fetch(`/api/user/activity/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setActivities(data.activities || []);
          setStats(
            data.stats || {
              totalActivities: 0,
              artistsFollowed: 0,
              showsAttended: 0,
              votesGiven: 0,
              setlistsCreated: 0,
            },
          );
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [user?.id]);

  useEffect(() => {
    let filtered = activities;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((activity) => {
        switch (filterType) {
          case "follows":
            return activity.type === "follow" || activity.type === "unfollow";
          case "votes":
            return activity.type === "vote_up" || activity.type === "vote_down";
          case "shows":
            return (
              activity.type === "show_attend" || activity.type === "show_plan"
            );
          case "setlists":
            return activity.type === "setlist_create";
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.description.toLowerCase().includes(query) ||
          activity.artistName?.toLowerCase().includes(query) ||
          activity.showName?.toLowerCase().includes(query) ||
          activity.songTitle?.toLowerCase().includes(query),
      );
    }

    setFilteredActivities(filtered);
  }, [activities, filterType, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    }
    if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    }
    if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }
    if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "unfollow":
        return <Heart className="h-4 w-4 text-muted-foreground" />;
      case "vote_up":
        return <ChevronUp className="h-4 w-4 text-green-500" />;
      case "vote_down":
        return <ChevronDown className="h-4 w-4 text-red-500" />;
      case "setlist_create":
        return <Music className="h-4 w-4 text-blue-500" />;
      case "show_attend":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "show_plan":
        return <Calendar className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const badges = {
      follow: { label: "Follow", variant: "default" as const },
      unfollow: { label: "Unfollow", variant: "secondary" as const },
      vote_up: { label: "Upvote", variant: "default" as const },
      vote_down: { label: "Downvote", variant: "destructive" as const },
      setlist_create: { label: "Setlist", variant: "default" as const },
      show_attend: { label: "Attended", variant: "default" as const },
      show_plan: { label: "Planning", variant: "secondary" as const },
    };

    const badge = badges[type as keyof typeof badges];
    return badge ? (
      <Badge variant={badge.variant} className="text-xs">
        {badge.label}
      </Badge>
    ) : null;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-lg bg-muted" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/profile">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
              </Link>
            </Button>
          </div>
          <h1 className="mb-2 font-bold text-3xl">Activity Feed</h1>
          <p className="text-muted-foreground">
            Your complete activity history on TheSet
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {stats.totalActivities}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Activities
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {stats.artistsFollowed}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Artists Followed
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="font-bold text-2xl">{stats.votesGiven}</div>
                  <div className="text-muted-foreground text-xs">
                    Votes Given
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {stats.showsAttended}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Shows Attended
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="font-bold text-2xl">
                    {stats.setlistsCreated}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Setlists Created
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="follows">Follows</SelectItem>
                    <SelectItem value="votes">Votes</SelectItem>
                    <SelectItem value="shows">Shows</SelectItem>
                    <SelectItem value="setlists">Setlists</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredActivities.length} Activities
              {searchQuery && ` matching "${searchQuery}"`}
              {filterType !== "all" && ` in ${filterType}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-1 flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {getActivityBadge(activity.type)}
                          <span className="text-muted-foreground text-xs">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                      </div>

                      {activity.artistImage && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage
                            src={activity.artistImage}
                            alt={activity.artistName}
                          />
                          <AvatarFallback>
                            <Music className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>

                    {/* Additional context */}
                    {(activity.showName || activity.venueName) && (
                      <div className="mt-2 text-muted-foreground text-xs">
                        {activity.showName && <span>{activity.showName}</span>}
                        {activity.venueName && (
                          <span> at {activity.venueName}</span>
                        )}
                        {activity.showDate && (
                          <span>
                            {" "}
                            • {new Date(activity.showDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredActivities.length === 0 && (
                <div className="py-12 text-center">
                  <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 font-semibold text-lg">
                    {searchQuery || filterType !== "all"
                      ? "No matching activities"
                      : "No activities yet"}
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    {searchQuery || filterType !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Start exploring shows and following artists to see your activity here"}
                  </p>
                  {!searchQuery && filterType === "all" && (
                    <div className="flex flex-col justify-center gap-2 sm:flex-row">
                      <Button asChild>
                        <Link href="/artists">Browse Artists</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/shows">Browse Shows</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Load more button placeholder */}
              {filteredActivities.length > 0 &&
                filteredActivities.length >= 20 && (
                  <div className="pt-6 text-center">
                    <Button variant="outline">Load More Activities</Button>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
