"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardHeader } from "@repo/design-system/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { cn } from "@repo/design-system/lib/utils";
import {
  Calendar,
  Disc,
  Loader2,
  MapPin,
  Music,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCSRFToken } from "~/hooks/use-csrf-token";
import { useDebounce } from "~/hooks/use-debounce";

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
  const { fetchWithCSRF } = useCSRFToken();

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
        // Prefer optimized search with fallback to standard search
        const optimizedEndpoint =
          variant === "artists-only"
            ? `/api/artists/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`
            : `/api/search/optimized?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;

        const standardEndpoint = `/api/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;

        let response = await fetch(optimizedEndpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          // Retry with standard endpoint once
          response = await fetch(standardEndpoint, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          if (!response.ok)
            throw new Error(`Search failed: ${response.status}`);
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
              const resp = await fetchWithCSRF(
                "/api/artists/import-ticketmaster",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ticketmasterId: result.externalId || result.id,
                    name: result.title,
                    imageUrl: result.imageUrl,
                    genres: result.genres,
                  }),
                },
              );

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
              const resp = await fetchWithCSRF("/api/artists/auto-import", {
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
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className={cn("relative w-full max-w-2xl", className)}>
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-12 border-2 border-primary/20 bg-background/95 pr-12 pl-12 text-base backdrop-blur transition-colors hover:border-primary/30 focus:border-primary/50 supports-[backdrop-filter]:bg-background/80 md:h-14 md:text-lg"
                onFocus={() =>
                  setIsOpen(query.length >= 2 && results.length > 0)
                }
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="-translate-y-1/2 absolute top-1/2 right-2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[90vw] max-w-[600px] p-0 md:w-[600px]"
          align="start"
        >
          <SearchResultsDropdown
            results={results}
            isLoading={isLoading}
            query={query}
            onSelect={handleSelect}
            searched={searched}
            importingArtistId={importingArtistId}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full max-w-md", className)}>
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-10 pl-10"
            onFocus={() => setIsOpen(query.length >= 2 && results.length > 0)}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <SearchResultsDropdown
          results={results}
          isLoading={isLoading}
          query={query}
          onSelect={handleSelect}
          searched={searched}
          importingArtistId={importingArtistId}
        />
      </PopoverContent>
    </Popover>
  );
}

function SearchResultsDropdown({
  results,
  isLoading,
  query,
  onSelect,
  searched,
  importingArtistId,
}: {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (result: SearchResult) => void;
  searched: boolean;
  importingArtistId: string | null;
}) {
  const getResultIcon = (type: string) => {
    switch (type) {
      case "artist":
        return Music;
      case "show":
        return Calendar;
      case "venue":
        return MapPin;
      case "song":
        return Disc;
      default:
        return Search;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case "artist":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "show":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "venue":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "song":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type]!.push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  const typeOrder = ["artist", "show", "venue", "song"];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "artist":
        return "Artists";
      case "show":
        return "Shows";
      case "venue":
        return "Venues";
      case "song":
        return "Songs";
      default:
        return type;
    }
  };

  return (
    <Command shouldFilter={false}>
      <CommandList className="max-h-80">
        {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
        {!isLoading && results.length === 0 && searched && (
          <CommandEmpty>
            <div className="py-4 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No results found for "{query}"
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Try searching for different terms
              </p>
            </div>
          </CommandEmpty>
        )}

        {typeOrder.map((type) => {
          const typeResults = groupedResults[type];
          if (!typeResults?.length) {
            return null;
          }

          return (
            <CommandGroup key={type} heading={getTypeLabel(type)}>
              {typeResults.map((result) => {
                const Icon = getResultIcon(result.type);

                return (
                  <CommandItem
                    key={result.id}
                    onSelect={() =>
                      importingArtistId !== result.id
                        ? onSelect(result)
                        : undefined
                    }
                    className={cn(
                      "flex cursor-pointer items-center gap-3 p-3",
                      importingArtistId === result.id &&
                        "opacity-70 cursor-wait",
                    )}
                  >
                    {result.imageUrl ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.imageUrl} alt={result.title} />
                        <AvatarFallback>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {result.title}
                        </span>
                        {result.verified && (
                          <div className="h-1 w-1 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="truncate text-muted-foreground text-sm">
                          {result.subtitle}
                          {result.date && ` • ${formatDate(result.date)}`}
                        </p>
                      )}
                    </div>

                    {importingArtistId === result.id ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs text-muted-foreground">
                          Importing...
                        </span>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs capitalize",
                          getResultBadgeColor(result.type),
                        )}
                      >
                        {result.type}
                      </Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </Command>
  );
}

UnifiedSearch.displayName = "UnifiedSearch";
