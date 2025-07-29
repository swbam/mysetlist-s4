"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/components/ui/card";
import {
  Calendar,
  ChevronRight,
  Heart,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface FeaturedShow {
  id: string;
  name: string;
  venue: string;
  date: string;
  imageUrl: string;
  attendees: number;
  votesCount: number;
}

interface TopVotedSong {
  id: string;
  title: string;
  artist: string;
  votes: number;
  percentage: number;
}

interface UpcomingShow {
  id: string;
  artist: string;
  venue: string;
  date: string;
  ticketsLeft?: number;
}

interface FeaturedContentUIProps {
  featuredShow: FeaturedShow | null;
  topVotedSongs: TopVotedSong[];
  upcomingHighlights: UpcomingShow[];
}

export default function FeaturedContentUI({
  featuredShow,
  topVotedSongs,
  upcomingHighlights,
}: FeaturedContentUIProps) {
  return (
    <section className="relative py-12 md:py-16 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="mb-8 text-center md:mb-12 animate-fade-in">
          <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
            Featured This Week
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            The most anticipated shows and hottest votes from the MySetlist
            community
          </p>
        </div>

        {/* Featured content grid */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          {/* Main featured show - spans 2 columns on large screens */}
          <div className="lg:col-span-2 animate-slide-up">
            {featuredShow && (
              <Card className="h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:bg-card/80">
                <div className="relative h-48 overflow-hidden sm:h-64 md:h-80 lg:h-96">
                  <Image
                    src={featuredShow.imageUrl}
                    alt={featuredShow.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  {/* Overlay content */}
                  <div className="absolute right-0 bottom-0 left-0 p-4 sm:p-6 md:p-8">
                    <Badge className="mb-3 border-0 bg-primary/90 backdrop-blur-sm">
                      <Trophy className="mr-1 h-3 w-3" />
                      Most Voted Show This Week
                    </Badge>
                    <h3 className="mb-2 font-bold text-lg text-white sm:text-xl md:text-2xl lg:text-3xl">
                      {featuredShow.name}
                    </h3>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/80 sm:mb-4 sm:gap-4 sm:text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {featuredShow.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(featuredShow.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {featuredShow.attendees.toLocaleString()} attending
                      </span>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      <Button
                        size="default"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <Link href={`/shows/${featuredShow.id}`}>
                          <span className="hidden sm:inline">
                            View Setlist Predictions
                          </span>
                          <span className="sm:hidden">View Predictions</span>
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <div className="text-white">
                        <span className="font-bold text-xl sm:text-2xl">
                          {(featuredShow.votesCount / 1000).toFixed(0)}K
                        </span>
                        <span className="ml-1 text-xs text-white/70 sm:text-sm">
                          votes cast
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Top voted songs */}
          <div className="animate-slide-up-delay-1">
            <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Top Voted Songs</h3>
                  <Badge variant="secondary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Live Results
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {topVotedSongs.map((song, index) => (
                  <div key={song.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-2xl text-muted-foreground">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{song.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {song.artist}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {song.percentage}%
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {(song.votes / 1000).toFixed(1)}K votes
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000 ease-out"
                        style={{ width: `${song.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link href="/voting">
                    <Heart className="mr-2 h-4 w-4" />
                    Vote for More Songs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming highlights */}
          <div className="lg:col-span-3 animate-slide-up-delay-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xl">
                    Upcoming Shows to Watch
                  </h3>
                  <Link
                    href="/shows"
                    className="flex items-center gap-1 text-primary text-sm hover:text-primary/80"
                  >
                    View All
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {upcomingHighlights.map((show) => (
                    <div key={show.id} className="animate-fade-in">
                      <Link
                        href={`/artists/${show.artist.toLowerCase().replace(" ", "-")}`}
                      >
                        <Card className="group border-border/30 transition-all duration-300 hover:bg-card/80">
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold transition-colors group-hover:text-primary">
                                  {show.artist}
                                </h4>
                                <p className="mt-1 text-muted-foreground text-sm">
                                  {show.venue}
                                </p>
                              </div>
                              {show.ticketsLeft !== undefined &&
                                show.ticketsLeft < 100 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {show.ticketsLeft} left
                                  </Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(show.date).toLocaleDateString()}
                              </span>
                              <span className="font-medium text-primary">
                                Vote Now →
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}