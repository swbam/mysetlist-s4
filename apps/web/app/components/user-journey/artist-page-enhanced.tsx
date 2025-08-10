"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Calendar,
  ExternalLink,
  Heart,
  MapPin,
  Music,
  Play,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EnhancedSearch } from "../enhanced-search";

interface Artist {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  genres?: string[];
  bio?: string;
  followers: number;
  monthlyListeners?: number;
  verified: boolean;
  externalUrls?: any;
  totalShows: number;
  upcomingShows: number;
  trendingScore: number;
}

interface Show {
  id: string;
  name: string;
  slug: string;
  date: string;
  startTime?: string;
  venue: {
    name: string;
    city: string;
    state: string;
  };
  ticketUrl?: string;
  voteCount: number;
  setlistCount: number;
}

interface ArtistPageEnhancedProps {
  artist: Artist;
  userId?: string;
}

export function ArtistPageEnhanced({
  artist,
  userId,
}: ArtistPageEnhancedProps) {
  const [shows, setShows] = useState<Show[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("shows");

  // Load artist shows and follow status
  useEffect(() => {
    const loadArtistData = async () => {
      try {
        // Load shows
        const showsResponse = await fetch(`/api/artists/${artist.slug}/shows`);
        if (showsResponse.ok) {
          const showsData = await showsResponse.json();
          setShows(showsData.shows || []);
        }

        // Load follow status if user is logged in
        if (userId) {
          const followResponse = await fetch(
            `/api/user/following/${artist.id}`,
          );
          if (followResponse.ok) {
            const followData = await followResponse.json();
            setIsFollowing(followData.isFollowing);
          }
        }
      } catch (error) {
        console.error("Error loading artist data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadArtistData();
  }, [artist.slug, artist.id, userId]);

  const handleFollow = async () => {
    if (!userId) {
      // Redirect to login
      window.location.href = "/auth/sign-in";
      return;
    }

    try {
      const response = await fetch("/api/user/following", {
        method: isFollowing ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artistId: artist.id,
        }),
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            {/* Artist Image */}
            <div className="flex-shrink-0">
              <div className="relative h-48 w-48 md:h-64 md:w-64">
                {artist.imageUrl ? (
                  <Image
                    src={artist.imageUrl}
                    alt={artist.name}
                    fill
                    className="object-cover rounded-lg shadow-lg"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted shadow-lg">
                    <Music className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Artist Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold md:text-4xl">
                      {artist.name}
                    </h1>
                    {artist.verified && (
                      <Badge variant="secondary" className="gap-1">
                        <Play className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {artist.genres && artist.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {artist.genres.slice(0, 3).map((genre) => (
                        <Badge key={genre} variant="outline">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className="gap-2"
                  >
                    <Heart
                      className={`h-4 w-4 ${isFollowing ? "fill-current" : ""}`}
                    />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  {artist.externalUrls?.spotify && (
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={artist.externalUrls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open on Spotify"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatNumber(artist.followers)}
                  </div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                {artist.monthlyListeners && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatNumber(artist.monthlyListeners)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Monthly Listeners
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {artist.upcomingShows}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Upcoming Shows
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{artist.totalShows}</div>
                  <div className="text-sm text-muted-foreground">
                    Total Shows
                  </div>
                </div>
              </div>

              {/* Bio */}
              {artist.bio && (
                <p className="text-muted-foreground leading-relaxed">
                  {artist.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="shows">Upcoming Shows</TabsTrigger>
            <TabsTrigger value="setlists">Recent Setlists</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="shows" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Upcoming Shows</h2>
                {shows.length > 0 && (
                  <Badge variant="secondary">{shows.length} shows</Badge>
                )}
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded mb-2" />
                        <div className="h-3 bg-muted rounded mb-1" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : shows.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {shows.map((show) => (
                    <Card
                      key={show.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{show.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(show.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          {show.startTime && ` at ${show.startTime}`}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {show.venue.name}, {show.venue.city},{" "}
                          {show.venue.state}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{show.voteCount} votes</span>
                            <span>{show.setlistCount} setlists</span>
                          </div>
                          <div className="flex gap-2">
                            {show.ticketUrl && (
                              <Button size="sm" variant="outline" asChild>
                                <a
                                  href={show.ticketUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Tickets
                                </a>
                              </Button>
                            )}
                            <Button size="sm" asChild>
                              <Link href={`/shows/${show.slug}`}>
                                Vote on Setlist
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Upcoming Shows
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      This artist doesn't have any upcoming shows scheduled.
                    </p>
                    <Button variant="outline">Get Notified of New Shows</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="setlists" className="mt-6">
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Recent Setlists</h3>
              <p className="text-muted-foreground">
                Setlist history will be displayed here once available.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trending Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {artist.trendingScore.toFixed(1)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on recent activity and engagement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Community
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>App Followers</span>
                      <span className="font-semibold">
                        {formatNumber(artist.followers)}
                      </span>
                    </div>
                    {artist.monthlyListeners && (
                      <div className="flex justify-between">
                        <span>Monthly Listeners</span>
                        <span className="font-semibold">
                          {formatNumber(artist.monthlyListeners)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
