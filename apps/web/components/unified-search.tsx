"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardHeader } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { Loader2, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";

// Lazy load Avatar components
const Avatar = dynamic(
  () =>
    import("@repo/design-system/components/ui/avatar").then(
      (mod) => mod.Avatar,
    ),
  { ssr: false },
);

const AvatarFallback = dynamic(
  () =>
    import("@repo/design-system/components/ui/avatar").then(
      (mod) => mod.AvatarFallback,
    ),
  { ssr: false },
);

const AvatarImage = dynamic(
  () =>
    import("@repo/design-system/components/ui/avatar").then(
      (mod) => mod.AvatarImage,
    ),
  { ssr: false },
);

// Lazy load search dropdown components
const SearchDropdownComponents = dynamic(
  () => import("./search-dropdown-components"),
  { ssr: false },
);

interface SearchResult {
  id: string;
  type: "artist" | "show" | "venue" | "song";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  date?: string;
  verified?: boolean;
  source: "database" | "ticketmaster" | "spotify";
  location?: string;
  artistName?: string;
  venueName?: string;
  externalId?: string;
  requiresSync?: boolean;
  popularity?: number;
  genres?: string[];
}

interface UnifiedSearchProps {
  placeholder?: string;
  className?: string;
  variant?: "default" | "hero" | "artists-only";
  showFilters?: boolean;
  onSelect?: (result: SearchResult) => void;
  limit?: number;
}

export function UnifiedSearch({
  placeholder = "Search artists, shows, venues...",
  className,
  variant = "default",
  showFilters = false,
  onSelect,
  limit = 8,
}: UnifiedSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingArtistId, setImportingArtistId] = useState<string | null>(
    null,
  );

  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Determine which API endpoint to use, with fallback options
        let endpoint: string;
        let fallbackEndpoint: string;

        if (variant === "artists-only") {
          endpoint = `/api/artists/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
          fallbackEndpoint = `/api/artists/search-simple?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
        } else {
          endpoint = `/api/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
          fallbackEndpoint = `/api/search-fallback?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
        }

        let response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        // If primary endpoint fails, try fallback
        if (!response.ok) {
          console.warn(
            `Primary endpoint failed (${response.status}), trying fallback...`,
          );
          response = await fetch(fallbackEndpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              `Both search endpoints failed. Status: ${response.status}`,
            );
          }
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Handle different response formats
        let searchResults: SearchResult[] = [];

        if (variant === "artists-only" && data.artists) {
          // Convert artist format to SearchResult format
          searchResults = data.artists.map((artist: any) => ({
            id: artist.id,
            type: "artist" as const,
            title: artist.name,
            subtitle: artist.genres?.slice(0, 2).join(", ") || "Artist",
            imageUrl: artist.imageUrl,
            slug: artist.id,
            source: artist.source,
            verified: artist.verified,
            popularity: artist.popularity,
            genres: artist.genres,
            externalId: artist.externalId,
            requiresSync: artist.source !== "database",
          }));
        } else if (data.results) {
          searchResults = data.results;
        }

        setResults(searchResults);
        setSearched(true);
        setIsOpen(true);
      } catch (err: any) {
        console.error("Search error:", err);
        setError(err.message || "Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [variant, limit],
  );

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, performSearch]);

  const handleSelect = async (result: SearchResult) => {
    if (onSelect) {
      onSelect(result);
      return;
    }

    try {
      setImportingArtistId(result.id);

      // Handle different result types
      switch (result.type) {
        case "artist":
          if (result.requiresSync || result.source === "ticketmaster") {
            // For Ticketmaster artists, use the import endpoint
            if (result.source === "ticketmaster") {
              const resp = await fetch("/api/artists/import-ticketmaster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ticketmasterId: result.externalId || result.id,
                  name: result.title,
                  imageUrl: result.imageUrl,
                  genres: result.genres,
                }),
              });

              const data = await resp.json();
              if (resp.ok && data.artist?.slug) {
                router.push(`/artists/${data.artist.slug}`);
              } else {
                console.warn("Artist import failed:", data.error);
                // Fallback to search page
                router.push(
                  `/artists?search=${encodeURIComponent(result.title)}`,
                );
              }
            } else {
              // For other external sources, use auto-import
              const resp = await fetch("/api/artists/auto-import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  artistName: result.title,
                  spotifyId:
                    result.source === "spotify" ? result.id : undefined,
                }),
              });

              const data = await resp.json();
              if (resp.ok && data.artist?.slug) {
                router.push(`/artists/${data.artist.slug}`);
              } else {
                console.warn("Artist import failed:", data.error);
                // Fallback to search page
                router.push(
                  `/artists?search=${encodeURIComponent(result.title)}`,
                );
              }
            }
          } else {
            router.push(`/artists/${result.slug || result.id}`);
          }
          break;

        case "show":
          router.push(`/shows/${result.slug || result.id}`);
          break;

        case "venue":
          router.push(`/venues/${result.slug || result.id}`);
          break;

        case "song":
          if (result.artistName) {
            router.push(
              `/artists?search=${encodeURIComponent(result.artistName)}`,
            );
          }
          break;
      }
    } catch (error) {
      console.error("Navigation error:", error);
      setError(`Failed to navigate to ${result.type}. Please try again.`);
      setImportingArtistId(null);
      return;
    } finally {
      setImportingArtistId(null);
    }

    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      clearSearch();
    } else if (e.key === "Enter" && results.length > 0 && results[0]) {
      handleSelect(results[0]);
    }
  };

  if (variant === "artists-only") {
    return (
      <div className={cn("mx-auto w-full max-w-3xl space-y-6", className)}>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-12 pl-10 text-lg"
          />
          {isLoading && (
            <Loader2 className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 animate-spin" />
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
            <p className="font-medium">Search Error</p>
            <p className="text-sm mt-1">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              onClick={() => {
                setError(null);
                performSearch(query);
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-4">
            {results.map((result) => (
              <Card
                key={`${result.source}-${result.id}`}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => handleSelect(result)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={result.imageUrl} alt={result.title} />
                      <AvatarFallback>
                        {result.title.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {result.title}
                        </h3>
                        {result.source !== "database" && (
                          <Badge variant="outline" className="text-xs">
                            {result.source === "spotify"
                              ? "Spotify"
                              : "Ticketmaster"}
                          </Badge>
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="mt-1 text-muted-foreground text-sm">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {importingArtistId === result.id ? (
                        <Button size="sm" disabled>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importing...
                        </Button>
                      ) : (
                        <Button size="sm" variant="default">
                          {result.source === "ticketmaster"
                            ? "Import & View"
                            : "View"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {query && !isLoading && results.length === 0 && searched && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              No artists found for "{query}". Try a different search term.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <SearchDropdownComponents
        variant="hero"
        query={query}
        setQuery={setQuery}
        results={results}
        isLoading={isLoading}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        handleSelect={handleSelect}
        clearSearch={clearSearch}
        handleKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        searched={searched}
        importingArtistId={importingArtistId}
        inputRef={inputRef}
      />
    );
  }

  return (
    <SearchDropdownComponents
      variant="default"
      query={query}
      setQuery={setQuery}
      results={results}
      isLoading={isLoading}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      handleSelect={handleSelect}
      clearSearch={clearSearch}
      handleKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      searched={searched}
      importingArtistId={importingArtistId}
      inputRef={inputRef}
    />
  );
}

UnifiedSearch.displayName = "UnifiedSearch";
