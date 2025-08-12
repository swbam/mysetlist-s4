"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import { Music, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Artist {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  follower_count?: number;
}

interface Show {
  id: string;
  title: string;
  slug: string;
  venue?: string;
  date?: string;
  artist_name?: string;
  vote_count?: number;
}

export default function TrendingSimple() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        // Fetch minimal trending data
        const [artistsRes, showsRes] = await Promise.all([
          fetch("/api/trending/artists?limit=4"),
          fetch("/api/trending/shows?limit=4"),
        ]);

        if (artistsRes.ok) {
          const artistData = await artistsRes.json();
          setArtists(artistData.artists || []);
        }

        if (showsRes.ok) {
          const showData = await showsRes.json();
          setShows(showData.shows || []);
        }
      } catch (error) {
        console.error("Failed to load trending data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-12">
        {/* Artists skeleton */}
        <section className="py-12 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="h-8 w-64 animate-pulse rounded bg-muted mb-8" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>
        </section>

        {/* Shows skeleton */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="h-8 w-64 animate-pulse rounded bg-muted mb-8" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Trending Artists */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Trending Artists
            </h2>
            <p className="text-muted-foreground mt-2">
              Discover the hottest artists that fans are talking about
            </p>
          </div>

          {artists.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {artists.map((artist) => (
                <Card key={artist.id} className="overflow-hidden">
                  <Link href={`/artists/${artist.slug}`}>
                    <div className="aspect-square relative bg-muted">
                      {artist.image_url ? (
                        <Image
                          src={artist.image_url}
                          alt={artist.name}
                          fill
                          className="object-cover transition-transform hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Music className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{artist.name}</h3>
                      {artist.follower_count && (
                        <p className="text-sm text-muted-foreground">
                          {artist.follower_count.toLocaleString()} followers
                        </p>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No trending artists available
            </p>
          )}

          <div className="mt-8 text-center">
            <Button asChild>
              <Link href="/artists">
                View All Artists
                <TrendingUp className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trending Shows */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Trending Shows
            </h2>
            <p className="text-muted-foreground mt-2">
              Join the conversation about the most popular shows
            </p>
          </div>

          {shows.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {shows.map((show) => (
                <Card key={show.id} className="p-6">
                  <Link href={`/shows/${show.slug}`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Show</Badge>
                        {show.vote_count && (
                          <span className="text-sm text-muted-foreground">
                            {show.vote_count} votes
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold line-clamp-2">
                        {show.title}
                      </h3>
                      {show.artist_name && (
                        <p className="text-sm text-muted-foreground">
                          {show.artist_name}
                        </p>
                      )}
                      {show.venue && (
                        <p className="text-sm text-muted-foreground">
                          {show.venue}
                        </p>
                      )}
                      {show.date && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(show.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No trending shows available
            </p>
          )}

          <div className="mt-8 text-center">
            <Button asChild>
              <Link href="/shows">
                View All Shows
                <TrendingUp className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
