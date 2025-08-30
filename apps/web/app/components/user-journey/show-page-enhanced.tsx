"use client";

import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { Input } from "@repo/design-system";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system";
import {
  Calendar,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  Music,
  Plus,
  Search,
  TrendingUp,
  Unlock,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRealtimeConnection } from "~/app/providers/realtime-provider";
import { RealtimeVoting } from "../realtime-voting";

interface Show {
  id: string;
  name: string;
  slug: string;
  date: string;
  startTime?: string;
  doorsTime?: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  description?: string;
  ticketUrl?: string;
  minPrice?: number;
  maxPrice?: number;
  currency: string;
  viewCount: number;
  attendeeCount: number;
  voteCount: number;
  trendingScore: number;
  artist: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
  };
  venue: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
    imageUrl?: string;
  };
}

interface SetlistSong {
  id: string;
  songId: string;
  position: number;
  song: {
    title: string;
    artist: string;
    album?: string;
    albumArtUrl?: string;
    durationMs?: number;
  };
  notes?: string;
  isPlayed?: boolean;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  userVote?: "up" | "down" | null;
}

interface Setlist {
  id: string;
  type: "predicted" | "actual";
  name: string;
  isLocked: boolean;
  totalVotes: number;
  accuracyScore?: number;
  songs: SetlistSong[];
}

interface ShowPageEnhancedProps {
  show: Show;
  userId?: string;
}

export function ShowPageEnhanced({ show, userId }: ShowPageEnhancedProps) {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("setlist");
  const [songSearch, setSongSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { isConnected } = useRealtimeConnection();

  // Load show setlists
  useEffect(() => {
    const loadSetlists = async () => {
      try {
        const response = await fetch(`/api/setlists/${show.id}`);
        if (response.ok) {
          const data = await response.json();
          setSetlists(data.setlists || []);
        }
      } catch (error) {
        console.error("Error loading setlists:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSetlists();
  }, [show.id]);

  // Search for songs to add
  useEffect(() => {
    const searchSongs = async () => {
      if (!songSearch.trim() || songSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/songs/search?q=${encodeURIComponent(songSearch)}&artist=${encodeURIComponent(show.artist.name)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.songs || []);
        }
      } catch (error) {
        console.error("Error searching songs:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchSongs, 300);
    return () => clearTimeout(timeoutId);
  }, [songSearch, show.artist.name]);

  const addSongToSetlist = async (songId: string, setlistId: string) => {
    if (!userId) {
      window.location.href = "/auth/sign-in";
      return;
    }

    try {
      const response = await fetch("/api/setlists/songs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setlistId,
          songId,
        }),
      });

      if (response.ok) {
        // Refresh setlists
        const setlistsResponse = await fetch(`/api/setlists/${show.id}`);
        if (setlistsResponse.ok) {
          const data = await setlistsResponse.json();
          setSetlists(data.setlists || []);
        }
        setSongSearch("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error adding song:", error);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500";
      case "ongoing":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const predictedSetlist = setlists.find((s) => s.type === "predicted");
  const actualSetlist = setlists.find((s) => s.type === "actual");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            {/* Show Image */}
            <div className="flex-shrink-0">
              <div className="relative h-48 w-48 md:h-64 md:w-64">
                {show.artist.imageUrl ? (
                  <Image
                    src={show.artist.imageUrl}
                    alt={show.name}
                    fill
                    className="rounded-lg object-cover shadow-lg"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted shadow-lg">
                    <Music className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Show Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(show.status)}`}
                    />
                    <Badge variant="secondary">{show.status}</Badge>
                    {isConnected && (
                      <Badge variant="outline" className="gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Live
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold md:text-4xl">
                    {show.name}
                  </h1>
                  <Link
                    href={`/artists/${show.artist.slug}`}
                    className="text-xl text-primary hover:underline"
                  >
                    {show.artist.name}
                  </Link>
                </div>

                <div className="flex gap-2">
                  {show.ticketUrl && (
                    <Button asChild>
                      <a
                        href={show.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get Tickets
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/venues/${show.venue.slug}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Show Details */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(show.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  {show.startTime && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Show: {show.startTime}
                      {show.doorsTime && ` • Doors: ${show.doorsTime}`}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <Link
                      href={`/venues/${show.venue.slug}`}
                      className="hover:underline"
                    >
                      {show.venue.name}, {show.venue.city}, {show.venue.state}
                    </Link>
                  </div>
                </div>

                <div className="space-y-2">
                  {show.minPrice && (
                    <div className="text-muted-foreground">
                      Tickets: {show.currency}
                      {show.minPrice}
                      {show.maxPrice &&
                        show.maxPrice !== show.minPrice &&
                        ` - ${show.currency}${show.maxPrice}`}
                    </div>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{show.viewCount} views</span>
                    <span>{show.attendeeCount} attending</span>
                    <span>{show.voteCount} votes</span>
                  </div>
                </div>
              </div>

              {show.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {show.description}
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
            <TabsTrigger value="setlist">Predicted Setlist</TabsTrigger>
            <TabsTrigger value="actual">Actual Setlist</TabsTrigger>
            <TabsTrigger value="info">Show Info</TabsTrigger>
          </TabsList>

          <TabsContent value="setlist" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Predicted Setlist</h2>
                <div className="flex items-center gap-2">
                  {predictedSetlist?.isLocked ? (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Unlock className="h-3 w-3" />
                      Open for Voting
                    </Badge>
                  )}
                  {predictedSetlist && (
                    <Badge variant="secondary">
                      {predictedSetlist.totalVotes} total votes
                    </Badge>
                  )}
                </div>
              </div>

              {/* Add Song Section */}
              {!predictedSetlist?.isLocked && userId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Song to Setlist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={`Search ${show.artist.name} songs...`}
                        value={songSearch}
                        onChange={(e) => setSongSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {searchResults.map((song) => (
                          <div
                            key={song.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              {song.albumArtUrl ? (
                                <Image
                                  src={song.albumArtUrl}
                                  alt={song.album || song.title}
                                  width={40}
                                  height={40}
                                  className="rounded"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                  <Music className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{song.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {song.album}{" "}
                                  {song.durationMs &&
                                    `• ${formatDuration(song.durationMs)}`}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() =>
                                predictedSetlist &&
                                addSongToSetlist(song.id, predictedSetlist.id)
                              }
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Setlist Songs */}
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded" />
                            <div className="space-y-1">
                              <div className="h-4 bg-muted rounded w-32" />
                              <div className="h-3 bg-muted rounded w-24" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="w-16 h-8 bg-muted rounded" />
                            <div className="w-16 h-8 bg-muted rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : predictedSetlist && predictedSetlist.songs.length > 0 ? (
                <div className="space-y-2">
                  {predictedSetlist.songs
                    .sort((a, b) => b.netVotes - a.netVotes)
                    .map((setlistSong, index) => (
                      <Card
                        key={setlistSong.id}
                        className="hover:shadow-sm transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                                {index + 1}
                              </div>
                              {setlistSong.song.albumArtUrl ? (
                                <Image
                                  src={setlistSong.song.albumArtUrl}
                                  alt={
                                    setlistSong.song.album ||
                                    setlistSong.song.title
                                  }
                                  width={40}
                                  height={40}
                                  className="rounded"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                  <Music className="h-4 w-4" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {setlistSong.song.title}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {setlistSong.song.album}
                                  {setlistSong.song.durationMs &&
                                    ` • ${formatDuration(setlistSong.song.durationMs)}`}
                                  {setlistSong.notes &&
                                    ` • ${setlistSong.notes}`}
                                </div>
                              </div>
                            </div>
                            <RealtimeVoting
                              setlistSongId={setlistSong.id}
                              initialVotes={{
                                upvotes: setlistSong.upvotes,
                                netVotes: setlistSong.netVotes,
                                userVote:
                                  setlistSong.userVote === "up" ? "up" : null,
                              }}
                              userId={userId}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Music className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Songs Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to predict what {show.artist.name} will play!
                    </p>
                    {userId ? (
                      <p className="text-sm text-muted-foreground">
                        Use the search above to add songs to the predicted
                        setlist.
                      </p>
                    ) : (
                      <Button asChild>
                        <Link href="/auth/sign-in">Sign In to Add Songs</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actual" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Actual Setlist</h2>
              {actualSetlist && actualSetlist.songs.length > 0 ? (
                <div className="space-y-2">
                  {actualSetlist.songs.map((setlistSong, index) => (
                    <Card key={setlistSong.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              {setlistSong.song.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {setlistSong.song.album}
                              {setlistSong.notes && ` • ${setlistSong.notes}`}
                            </div>
                          </div>
                          {setlistSong.isPlayed && (
                            <Badge variant="secondary">Played</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Music className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Actual Setlist Yet
                    </h3>
                    <p className="text-muted-foreground">
                      The actual setlist will be updated during or after the
                      show.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="info" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Show Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Views</span>
                    <span className="font-semibold">{show.viewCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>People Attending</span>
                    <span className="font-semibold">{show.attendeeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Votes</span>
                    <span className="font-semibold">{show.voteCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trending Score</span>
                    <span className="font-semibold">
                      {show.trendingScore.toFixed(1)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Venue Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="font-semibold">{show.venue.name}</div>
                    <div className="text-muted-foreground">
                      {show.venue.city}, {show.venue.state}
                    </div>
                  </div>
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/venues/${show.venue.slug}`}>
                      View Venue Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
