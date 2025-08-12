"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { cn } from "@repo/design-system/lib/utils";
import { Music, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";

interface TicketmasterArtist {
  id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  upcomingEvents: number;
  popularity?: number;
  externalUrls?: {
    spotify?: string;
    website?: string;
  };
}

interface TicketmasterArtistSearchProps {
  className?: string;
  placeholder?: string;
  onArtistSelect?: (artist: TicketmasterArtist) => void;
}

export function TicketmasterArtistSearch({
  className,
  placeholder = "Search for artists...",
  onArtistSelect,
}: TicketmasterArtistSearchProps) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TicketmasterArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/search/ticketmaster-artists?q=${encodeURIComponent(searchQuery)}&limit=8`,
      );
      const data = await response.json();

      if (response.ok) {
        setResults(data.artists || []);
        setHasSearched(true);
      } else {
        console.error("Search failed:", data);
        setResults([]);
        setHasSearched(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [debouncedQuery, performSearch]);

  const handleArtistClick = async (artist: TicketmasterArtist) => {
    if (onArtistSelect) {
      onArtistSelect(artist);
      return;
    }

    try {
      setIsLoading(true);

      // Import artist to get proper database slug
      const importResponse = await fetch("/api/artists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketmasterId: artist.id,
          name: artist.name,
          imageUrl: artist.imageUrl,
          genres: artist.genres,
          upcomingEvents: artist.upcomingEvents,
          externalUrls: artist.externalUrls,
        }),
      });

      if (importResponse.ok) {
        const importData = await importResponse.json();
        router.push(`/artists/${importData.artist.slug}`);
      } else {
        // Fallback to search slug
        const slug = artist.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        router.push(`/artists/${slug}`);
      }
    } catch (error) {
      console.error("Failed to import artist:", error);
      // Fallback to search slug
      const slug = artist.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      router.push(`/artists/${slug}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getPopularityColor = (popularity?: number) => {
    if (!popularity) return "bg-gray-100 text-gray-600";
    if (popularity >= 80) return "bg-red-100 text-red-700";
    if (popularity >= 60) return "bg-orange-100 text-orange-700";
    if (popularity >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-4 text-lg h-12"
          autoComplete="off"
        />
        {query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Music className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      {query && (
        <div className="space-y-3">
          {isLoading && results.length === 0 && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="py-8 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No artists found</h3>
              <p className="text-muted-foreground">
                Try searching for a different artist name
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Live results from Ticketmaster</span>
              </div>

              <div className="space-y-2">
                {results.map((artist) => (
                  <div
                    key={artist.id}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200 hover:border-primary hover:shadow-md"
                    onClick={() => handleArtistClick(artist)}
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded bg-muted">
                      {artist.imageUrl ? (
                        <Image
                          src={artist.imageUrl}
                          alt={artist.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-110"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium group-hover:text-primary">
                          {artist.name}
                        </span>
                        {artist.popularity && artist.popularity >= 70 && (
                          <Sparkles className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {artist.genres.length > 0 && (
                          <span className="truncate">
                            {artist.genres.slice(0, 2).join(", ")}
                          </span>
                        )}
                        {artist.upcomingEvents > 0 && (
                          <>
                            {artist.genres.length > 0 && <span>•</span>}
                            <span>{artist.upcomingEvents} upcoming shows</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {artist.popularity && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs font-medium",
                            getPopularityColor(artist.popularity),
                          )}
                        >
                          {artist.popularity}%
                        </Badge>
                      )}
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="text-xs text-muted-foreground">
                          View →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
