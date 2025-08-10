"use client";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { ChevronRight, Loader2, Music, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { useDebounce } from "~/hooks/use-debounce";

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
    router.push(`/artists/${slug}?ticketmaster=${artist.id}`);
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
            <div
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2"
              role="status"
              aria-label="Live statistics"
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-sm">
                Trending Now: 1,247 Active Shows
              </span>
            </div>

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
            {/* Search container with glow effect */}
            <div className="relative mx-auto w-full max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search artists via Ticketmaster..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowDropdown(results.length > 0)}
                  className="h-12 border-2 border-primary/20 bg-background/95 pr-12 pl-12 text-base backdrop-blur transition-colors hover:border-primary/30 focus:border-primary/50 supports-[backdrop-filter]:bg-background/80 md:h-14 md:text-lg"
                />
                {isLoading && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>

              {/* Search results dropdown */}
              {showDropdown && results.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                >
                  {results.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => handleArtistSelect(artist)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 border-b border-border last:border-b-0"
                    >
                      {artist.imageUrl && (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {artist.name}
                        </div>
                        {artist.genres && artist.genres.length > 0 && (
                          <div className="text-sm text-muted-foreground truncate">
                            {artist.genres.slice(0, 2).join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        Ticketmaster
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick search suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-sm sm:px-0">
              <span className="text-muted-foreground hidden sm:inline">
                Popular:
              </span>
              <span className="text-muted-foreground text-xs sm:hidden">
                Trending:
              </span>
              {["Taylor Swift", "The Weeknd", "Drake", "Olivia Rodrigo"].map(
                (artist) => (
                  <Link
                    key={artist}
                    href={`/artists/${artist.toLowerCase().replace(" ", "-")}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted sm:text-sm"
                  >
                    {artist}
                  </Link>
                ),
              )}
            </div>
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
          <div
            className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 px-4 sm:px-0 md:grid-cols-3 md:gap-8 animate-fade-in-delay-3"
            role="region"
            aria-label="Platform statistics"
          >
            <div className="text-center">
              <div
                className="font-bold text-2xl sm:text-3xl md:text-4xl"
                aria-label="Ten thousand plus"
              >
                10K+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Active Artists
              </div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
                50M+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Votes Cast
              </div>
            </div>
            <div className="col-span-2 text-center md:col-span-1">
              <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
                100K+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Music Fans
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(HomeHero);
