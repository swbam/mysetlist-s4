"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { cn } from "@repo/design-system/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Clock,
  Music,
  PlayCircle,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "~/lib/supabase/client";

type ActivityType = "vote" | "song_played" | "user_joined" | "setlist_updated";

type Activity = {
  id: string;
  type: ActivityType;
  timestamp: Date;
  data: {
    userName?: string;
    songTitle?: string;
    artistName?: string;
    voteType?: "up" | "down";
    showName?: string;
    venueName?: string;
  };
};

interface RealtimeActivityFeedProps {
  showId?: string;
  limit?: number;
  className?: string;
}

export function RealtimeActivityFeed({
  showId,
  limit = 10,
  className,
}: RealtimeActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
        },
        async (payload) => {
          // Fetch additional data for the vote
          const voteData = await fetchVoteDetails(payload.new);
          if (voteData) {
            const activity: Activity = {
              id: `vote-${payload.new.id}`,
              type: "vote",
              timestamp: new Date(payload.new.created_at),
              data: voteData,
            };
            addActivity(activity);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "setlist_songs",
          filter: "is_played=eq.true",
        },
        async (payload) => {
          if (payload.new.is_played && !payload.old.is_played) {
            const songData = await fetchSongDetails(payload.new);
            if (songData) {
              const activity: Activity = {
                id: `played-${payload.new.id}`,
                type: "song_played",
                timestamp: new Date(payload.new.play_time),
                data: songData,
              };
              addActivity(activity);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendees",
        },
        async (payload) => {
          const attendeeData = await fetchAttendeeDetails(payload.new);
          if (attendeeData) {
            const activity: Activity = {
              id: `joined-${payload.new.id}`,
              type: "user_joined",
              timestamp: new Date(payload.new.created_at),
              data: attendeeData,
            };
            addActivity(activity);
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    // Fetch initial activities
    fetchRecentActivities();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId]);

  const fetchRecentActivities = async () => {
    try {
      // This would be replaced with actual API calls
      // For now, we'll just set some mock data
      const mockActivities: Activity[] = [
        {
          id: "1",
          type: "song_played",
          timestamp: new Date(Date.now() - 1000 * 60 * 2),
          data: {
            songTitle: "Bohemian Rhapsody",
            artistName: "Queen",
            showName: "Queen Live",
          },
        },
        {
          id: "2",
          type: "vote",
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          data: {
            userName: "John Doe",
            songTitle: "We Will Rock You",
            voteType: "up",
          },
        },
      ];
      setActivities(mockActivities);
    } catch (_error) {}
  };

  const fetchVoteDetails = async (vote: any) => {
    // This would fetch actual data from the API
    return {
      userName: "Anonymous User",
      songTitle: "Song Title",
      voteType: vote.vote_type as "up" | "down",
    };
  };

  const fetchSongDetails = async (_setlistSong: any) => {
    // This would fetch actual data from the API
    return {
      songTitle: "Song Title",
      artistName: "Artist Name",
      showName: "Show Name",
    };
  };

  const fetchAttendeeDetails = async (_attendee: any) => {
    // This would fetch actual data from the API
    return {
      userName: "New User",
      showName: "Show Name",
      venueName: "Venue Name",
    };
  };

  const addActivity = (activity: Activity) => {
    setActivities((prev) => {
      const updated = [activity, ...prev].slice(0, limit);
      return updated.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    });
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "vote":
        return ThumbsUp;
      case "song_played":
        return PlayCircle;
      case "user_joined":
        return UserPlus;
      case "setlist_updated":
        return Music;
      default:
        return Activity;
    }
  };

  const getActivityMessage = (activity: Activity) => {
    const { type, data } = activity;

    switch (type) {
      case "vote":
        return (
          <>
            <span className="font-medium">{data.userName}</span> voted{" "}
            {data.voteType === "up" ? (
              <ThumbsUp className="inline h-3 w-3 text-green-600" />
            ) : (
              <ThumbsDown className="inline h-3 w-3 text-red-600" />
            )}{" "}
            on <span className="font-medium">{data.songTitle}</span>
          </>
        );
      case "song_played":
        return (
          <>
            Now playing: <span className="font-medium">{data.songTitle}</span>{" "}
            by <span className="font-medium">{data.artistName}</span>
          </>
        );
      case "user_joined":
        return (
          <>
            <span className="font-medium">{data.userName}</span> joined{" "}
            <span className="font-medium">{data.showName}</span>
          </>
        );
      case "setlist_updated":
        return (
          <>
            Setlist updated for{" "}
            <span className="font-medium">{data.showName}</span>
          </>
        );
      default:
        return "Activity occurred";
    }
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-medium text-lg">
            <Activity className="h-5 w-5" />
            Live Activity
          </CardTitle>
          {isConnected && (
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700"
            >
              <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 pt-0">
            <AnimatePresence mode="popLayout">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                activities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-start gap-3 border-b py-3 last:border-0"
                    >
                      <div
                        className={cn(
                          "rounded-full p-2",
                          activity.type === "vote" &&
                            "bg-blue-100 text-blue-600",
                          activity.type === "song_played" &&
                            "bg-green-100 text-green-600",
                          activity.type === "user_joined" &&
                            "bg-purple-100 text-purple-600",
                          activity.type === "setlist_updated" &&
                            "bg-orange-100 text-orange-600",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed">
                          {getActivityMessage(activity)}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(activity.timestamp, {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
