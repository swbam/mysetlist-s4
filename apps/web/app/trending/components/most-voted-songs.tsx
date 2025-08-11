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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Calendar,
  ExternalLink,
  Music,
  Play,
  TrendingUp,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface MostVotedSong {
  id: string;
  title: string;
  artist: string;
  artistSlug: string;
  totalVotes: number;
  showCount: number;
  lastVotedAt: string;
  albumArtUrl: string | null;
}

export function MostVotedSongs() {
  const [songs, setSongs] = useState<{
    week: MostVotedSong[];
    month: MostVotedSong[];
    all: MostVotedSong[];
  }>({
    week: [],
    month: [],
    all: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("week");

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const [weekData, monthData, allData] = await Promise.all([
        fetch("/api/trending/insights?type=songs&timeframe=week&limit=15").then(r => r.json()),
        fetch("/api/trending/insights?type=songs&timeframe=month&limit=15").then(r => r.json()),
        fetch("/api/trending/insights?type=songs&timeframe=all&limit=15").then(r => r.json()),
      ]);

      setSongs({
        week: weekData.data.songs || [],
        month: monthData.data.songs || [],
        all: allData.data.songs || [],
      });
    } catch (err) {
      setError("Failed to load most voted songs");
      console.error("Error fetching most voted songs:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Less than an hour ago";
    }
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString();
  };

  const SongsList = ({ songs, timeframe }: { songs: MostVotedSong[]; timeframe: string }) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="w-8 text-center">
                <Skeleton className="h-4 w-4 mx-auto" />
              </div>
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-8 text-center">
          <p className="mb-4 text-muted-foreground">{error}</p>
          <Button onClick={fetchSongs} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      );
    }

    if (songs.length === 0) {
      return (
        <div className="py-8 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            No voted songs found for {timeframe}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {songs.map((song, index) => (
          <div
            key={song.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-md transition-shadow"
          >
            {/* Rank */}
            <div className="w-8 text-center">
              <span className="font-bold text-xl text-muted-foreground">
                {index + 1}
              </span>
            </div>

            {/* Album Art */}
            <Avatar className="h-12 w-12 rounded-md">
              <AvatarImage src={song.albumArtUrl || ""} alt={song.title} />
              <AvatarFallback className="rounded-md">
                <Music className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold truncate">{song.title}</h4>
                <Badge variant="secondary" className="text-xs">
                  <Play className="h-3 w-3 mr-1" />
                  {song.showCount} shows
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                  href={`/artists/${song.artistSlug}`}
                  className="hover:underline hover:text-foreground"
                >
                  {song.artist}
                </Link>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatTimeAgo(song.lastVotedAt)}
                </span>
              </div>
            </div>

            {/* Vote Count */}
            <div className="text-right">
              <div className="flex items-center gap-1 font-semibold text-green-600">
                <Vote className="h-4 w-4" />
                {song.totalVotes}
              </div>
              <p className="text-xs text-muted-foreground">votes</p>
            </div>

            {/* Action */}
            <Link href={`/artists/${song.artistSlug}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Most Voted Songs
        </CardTitle>
        <CardDescription>
          Songs fans are most excited to hear live
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="mt-6">
            <SongsList songs={songs.week} timeframe="this week" />
          </TabsContent>

          <TabsContent value="month" className="mt-6">
            <SongsList songs={songs.month} timeframe="this month" />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <SongsList songs={songs.all} timeframe="all time" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}