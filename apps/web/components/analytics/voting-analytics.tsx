"use client";

import { Badge } from "@repo/design-system/badge";
import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/tabs";
import {
  Activity,
  Calendar,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import { useEffect, useState } from "react";

interface VotingMetrics {
  totalVotes: number;
  uniqueVoters: number;
  avgVotesPerUser: number;
  votingParticipation: number;
  topVotedSongs: Array<{
    title: string;
    artist: string;
    votes: number;
    showName: string;
    venue: string;
  }>;
  mostActiveVoters: Array<{
    name: string;
    votes: number;
    favoriteArtist: string;
  }>;
  votingTrends: Array<{
    period: string;
    votes: number;
    uniqueVoters: number;
  }>;
  votingByTime: Array<{
    hour: number;
    votes: number;
  }>;
  showVotingStats: Array<{
    showName: string;
    artist: string;
    venue: string;
    totalVotes: number;
    uniqueVoters: number;
    avgVotesPerSong: number;
    date: string;
  }>;
}

export function VotingAnalytics() {
  const [metrics, setMetrics] = useState<VotingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    fetchVotingMetrics();
  }, [period]);

  const fetchVotingMetrics = async () => {
    try {
      setLoading(true);

      // Mock data - in production this would fetch from /api/analytics?metric=voting
      const mockData: VotingMetrics = {
        totalVotes: 12547,
        uniqueVoters: 3210,
        avgVotesPerUser: 3.9,
        votingParticipation: 67.5,
        topVotedSongs: [
          {
            title: "Shake It Off",
            artist: "Taylor Swift",
            votes: 1250,
            showName: "Eras Tour",
            venue: "Madison Square Garden",
          },
          {
            title: "Blinding Lights",
            artist: "The Weeknd",
            votes: 1180,
            showName: "After Hours Til Dawn",
            venue: "Staples Center",
          },
          {
            title: "Bad Guy",
            artist: "Billie Eilish",
            votes: 1090,
            showName: "Happier Than Ever Tour",
            venue: "Red Rocks Amphitheatre",
          },
          {
            title: "Circles",
            artist: "Post Malone",
            votes: 980,
            showName: "Twelve Carat Tour",
            venue: "The Forum",
          },
          {
            title: "As It Was",
            artist: "Harry Styles",
            votes: 950,
            showName: "Love On Tour",
            venue: "Wembley Stadium",
          },
        ],
        mostActiveVoters: [
          { name: "MusicFan2024", votes: 847, favoriteArtist: "Taylor Swift" },
          { name: "ConcertGoer", votes: 692, favoriteArtist: "The Weeknd" },
          {
            name: "SetlistExpert",
            votes: 580,
            favoriteArtist: "Billie Eilish",
          },
          { name: "VotingMachine", votes: 534, favoriteArtist: "Post Malone" },
          { name: "MelodyMaster", votes: 489, favoriteArtist: "Harry Styles" },
        ],
        votingTrends: generateTrendData(period),
        votingByTime: generateHourlyData(),
        showVotingStats: [
          {
            showName: "Eras Tour",
            artist: "Taylor Swift",
            venue: "Madison Square Garden",
            totalVotes: 3420,
            uniqueVoters: 890,
            avgVotesPerSong: 142.5,
            date: "2024-01-15",
          },
          {
            showName: "After Hours Til Dawn",
            artist: "The Weeknd",
            venue: "Staples Center",
            totalVotes: 2890,
            uniqueVoters: 720,
            avgVotesPerSong: 120.4,
            date: "2024-01-20",
          },
          {
            showName: "Happier Than Ever Tour",
            artist: "Billie Eilish",
            venue: "Red Rocks Amphitheatre",
            totalVotes: 2560,
            uniqueVoters: 650,
            avgVotesPerSong: 109.8,
            date: "2024-01-25",
          },
        ],
      };

      setMetrics(mockData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load voting analytics",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateTrendData = (periodType: string) => {
    const days = periodType === "month" ? 30 : periodType === "week" ? 7 : 1;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        period: date.toLocaleDateString(),
        votes: Math.floor(Math.random() * 500) + 200,
        uniqueVoters: Math.floor(Math.random() * 150) + 50,
      };
    });
  };

  const generateHourlyData = () => {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      votes: Math.floor(Math.random() * 200) + 50,
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error loading voting analytics: {error}</p>
            <Button onClick={fetchVotingMetrics} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="h-6 w-6" />
            Voting Analytics
          </h2>
          <p className="text-muted-foreground">
            Comprehensive insights into user voting behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={period === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("day")}
          >
            Day
          </Button>
          <Button
            variant={period === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("week")}
          >
            Week
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("month")}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Vote className="h-4 w-4 text-purple-500" />
              Total Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalVotes.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Across all shows and songs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Unique Voters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.uniqueVoters.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.votingParticipation.toFixed(1)}% participation rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Avg Votes/User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avgVotesPerUser.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              Average engagement per voter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              Participation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.votingParticipation.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Of total active users
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trends">Voting Trends</TabsTrigger>
          <TabsTrigger value="songs">Top Songs</TabsTrigger>
          <TabsTrigger value="users">Active Voters</TabsTrigger>
          <TabsTrigger value="shows">Show Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Voting Volume Over Time</CardTitle>
                <CardDescription>Total votes cast each day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {/* Chart component would go here */}
                  <div className="h-full w-full bg-muted/20 rounded flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Voting trends chart
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Voting by Hour</CardTitle>
                <CardDescription>When users are most active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <div className="h-full w-full bg-muted/20 rounded flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Hourly voting patterns
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="songs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top Voted Songs
              </CardTitle>
              <CardDescription>
                Most popular song requests across all shows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topVotedSongs.map((song, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{song.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {song.artist} • {song.showName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {song.venue}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {song.votes.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">votes</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Most Active Voters
              </CardTitle>
              <CardDescription>
                Users who contribute the most to voting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.mostActiveVoters.map((voter, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{voter.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Favorite: {voter.favoriteArtist}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {voter.votes.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">votes</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shows">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Show Voting Performance
              </CardTitle>
              <CardDescription>
                Voting statistics for recent shows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.showVotingStats.map((show, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{show.showName}</div>
                        <div className="text-sm text-muted-foreground">
                          {show.artist} • {show.venue}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(show.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {show.totalVotes.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total Votes
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {show.uniqueVoters.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Voters
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {show.avgVotesPerSong.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg/Song
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
