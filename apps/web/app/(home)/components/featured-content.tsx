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

// Mock data for featured content
const featuredArtists = [
  {
    id: 1,
    name: "Taylor Swift",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    genre: "Pop",
    upcomingShows: 5,
    trending: true,
  },
  {
    id: 2,
    name: "The Weeknd",
    image:
      "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=400&h=400&fit=crop",
    genre: "R&B",
    upcomingShows: 3,
    trending: true,
  },
  {
    id: 3,
    name: "Arctic Monkeys",
    image:
      "https://images.unsplash.com/photo-1549834125-82d3c48159a3?w=400&h=400&fit=crop",
    genre: "Rock",
    upcomingShows: 7,
    trending: false,
  },
];

const featuredShows = [
  {
    id: 1,
    artist: "Coldplay",
    venue: "Madison Square Garden",
    city: "New York, NY",
    date: "2024-03-15",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop",
    votesCount: 1234,
  },
  {
    id: 2,
    artist: "Ed Sheeran",
    venue: "O2 Arena",
    city: "London, UK",
    date: "2024-03-22",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=400&fit=crop",
    votesCount: 987,
  },
];

function FeaturedContent() {
  return (
    <section className="py-16">
      <div className="space-y-16">
        {/* Featured Artists */}
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Featured Artists
              </h2>
              <p className="text-muted-foreground mt-2">
                Top artists with upcoming shows
              </p>
            </div>
            <Link href="/artists">
              <Button variant="ghost" className="gap-2">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredArtists.map((artist) => (
              <Card
                key={artist.id}
                className="group overflow-hidden transition-all hover:shadow-lg"
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    {artist.trending && (
                      <Badge className="absolute top-4 right-4 gap-1">
                        <Sparkles className="h-3 w-3" />
                        Trending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-xl">{artist.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {artist.genre}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm">
                      {artist.upcomingShows} upcoming shows
                    </span>
                    <Link href={`/artists/${artist.id}`}>
                      <Button size="sm" variant="secondary">
                        View Artist
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Shows */}
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Hot Shows This Week
              </h2>
              <p className="text-muted-foreground mt-2">
                Most voted upcoming performances
              </p>
            </div>
            <Link href="/shows">
              <Button variant="ghost" className="gap-2">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {featuredShows.map((show) => (
              <Card
                key={show.id}
                className="group overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={show.image}
                    alt={`${show.artist} at ${show.venue}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-bold text-2xl">{show.artist}</h3>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {show.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(show.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {show.votesCount.toLocaleString()} votes
                      </span>
                    </div>
                    <Link href={`/shows/${show.id}`}>
                      <Button size="sm">Vote on Setlist</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <Trophy className="mx-auto h-12 w-12 text-primary mb-4" />
            <h3 className="font-bold text-2xl mb-2">
              Join the MySetlist Community
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Be part of the revolution in concert experiences. Vote on
              setlists, discover new artists, and help shape the future of live
              music.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Get Started Free
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default FeaturedContent;
