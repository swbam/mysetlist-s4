"use client";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { ChevronRight, Loader2, Music, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { useDebounce } from "~/hooks/use-debounce";
import { RealActiveShows } from "./real-active-shows";
import { RealPopularArtists } from "./real-popular-artists";
import { RealStats } from "./real-stats";

interface ArtistResult {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  source: "ticketmaster";
  externalId: string;
}

function HomeHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  const searchArtists = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=6`,
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setShowDropdown(data.results?.length > 0);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      searchArtists(debouncedQuery);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [debouncedQuery, searchArtists]);

  const handleArtistSelect = async (artist: ArtistResult) => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);

    // For Ticketmaster artists, navigate to artist page using the name as slug
    const slug = artist.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Fire and forget import to ensure DB slug exists
    fetch("/api/artists/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmAttractionId: artist.id,
      }),
    }).catch(() => {});

    router.push(`/artists/${slug}`);
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node) &&
      inputRef.current &&
      !inputRef.current.contains(event.target as Node)
    ) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <section
      className="relative overflow-hidden pt-32 pb-40 bg-background"
      aria-label="Homepage hero section"
      role="banner"
    >
      {/* Simple background */}
      <div className="-z-10 absolute inset-0 animate-fade-in">
        <div className="absolute inset-0" />
      </div>

      <div className="container mx-auto px-4">
        {/* Hero content */}
        <div className="mx-auto max-w-5xl text-center">
          <div className="space-y-6 animate-slide-up">
            {/* Badge */}
            <RealActiveShows />

            {/* Main heading */}
            <h1
              className="font-extrabold text-6xl leading-[0.95] tracking-tight md:text-8xl"
              id="main-heading"
            >
              Crowd-Curated
              <br />
              <span className="text-muted-foreground">Setlists</span>
            </h1>

            {/* Subheading */}
            <p className="mx-auto max-w-3xl text-muted-foreground text-xl leading-relaxed md:text-2xl">
              Vote on the songs you want to hear at upcoming concerts and see
              what other fans are predicting.
            </p>
          </div>

          {/* Enhanced search section */}
          <div className="mt-12 space-y-4 px-4 sm:px-0 animate-slide-up-delay-1">
            {/* Search container - input and button aligned, responsive */}
            <div className="mx-auto w-full max-w-2xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search artists via Ticketmaster..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowDropdown(results.length > 0)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        results.length > 0 &&
                        results[0]
                      ) {
                        handleArtistSelect(results[0]);
                      }
                    }}
                    className="h-12 md:h-14 border-2 border-primary/20 bg-background/95 pl-12 pr-4 text-base md:text-lg backdrop-blur transition-colors hover:border-primary/30 focus:border-primary/50 supports-[backdrop-filter]:bg-background/80"
                  />
                  {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (query.trim() && results.length > 0 && results[0]) {
                      handleArtistSelect(results[0]);
                    }
                  }}
                  disabled={!query.trim()}
                  className="h-12 md:h-14 px-4 md:px-6 whitespace-nowrap"
                >
                  Search
                </Button>
              </div>

              {/* Search results dropdown */}
              {showDropdown && results.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-1/2 z-50 mt-2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-lg border border-border bg-background shadow-lg max-h-96 overflow-y-auto"
                >
                  {results.map((artist) => (
                    <button
                      type="button"
                      key={artist.id}
                      onClick={() => handleArtistSelect(artist)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted"
                    >
                      {artist.imageUrl && (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">
                          {artist.name}
                        </div>
                        {artist.genres && artist.genres.length > 0 && (
                          <div className="truncate text-sm text-muted-foreground">
                            {artist.genres.slice(0, 2).join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                        Ticketmaster
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick search suggestions */}
            <RealPopularArtists />
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4 sm:px-0 animate-slide-up-delay-2">
            <Button
              size="lg"
              className="group w-full min-w-[200px] sm:w-auto"
              asChild
            >
              <Link href="/artists">
                Start Voting
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full min-w-[200px] sm:w-auto"
              asChild
            >
              <Link href="/discover">
                <Music className="mr-2 h-4 w-4" />
                Discover Music
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <RealStats />
        </div>
      </div>
    </section>
  );
}

export default memo(HomeHero);
