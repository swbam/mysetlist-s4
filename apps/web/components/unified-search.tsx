"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardHeader } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { cn } from "@repo/design-system/lib/utils";
import {
  Music,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";
import { SearchResultsDropdown, type SearchResultItem } from "~/components/search/search-results-dropdown";
import { SearchDropdownSkeleton } from "~/components/skeletons/search-skeleton";

// Use SearchResultItem from our reusable component
type SearchResult = SearchResultItem;

interface UnifiedSearchProps {
  placeholder?: string;
  className?: string;
  variant?: "default" | "hero" | "artists-only";
  showFilters?: boolean;
  onSelect?: (result: SearchResult) => void;
  limit?: number;
}

export function UnifiedSearch({
  placeholder = "Search artists...",
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

  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  // Removed unused CSRF token hook

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
        // Always use artist search endpoint - only artists are searchable
        const endpoint = `/api/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Convert all results to SearchResult format (all will be artists)
        const searchResults: SearchResult[] = (data.results || []).map((result: any) => ({
          id: result.id,
          type: "artist" as const,
          title: result.name,
          subtitle: result.description || "Artist",
          imageUrl: result.imageUrl,
          slug: result.metadata?.slug,
          source: result.metadata?.source || "ticketmaster",
          popularity: result.metadata?.popularity || 0,
          genres: result.metadata?.genres || [],
          externalId: result.metadata?.externalId || result.id,
          requiresSync: result.metadata?.source === "ticketmaster",
        }));

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
      // Generate slug from artist name
      const slug = result.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Navigate instantly to artist page with Ticketmaster ID for background sync
      router.push(`/artists/${slug}?ticketmaster=${result.externalId || result.id.replace("tm_", "")}`);
      
      // Trigger background sync after navigation
      fetch("/api/sync/artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketmasterId: result.externalId || result.id.replace("tm_", ""),
          artistName: result.title,
          syncType: "full",
        }),
      }).catch((error) => {
        console.error("Background sync trigger failed:", error);
        // Silent fail - user still gets navigation
      });
    } catch (error) {
      console.error("Navigation error:", error);
      setError(`Failed to navigate to artist. Please try again.`);
      return;
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
                        {result.source === "ticketmaster" && (
                          <Badge variant="outline" className="text-xs">
                            Ticketmaster
                          </Badge>
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="mt-1 text-muted-foreground text-sm">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    {/* Click anywhere on the card to navigate */}
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
          {isLoading && results.length === 0 ? (
            <SearchDropdownSkeleton />
          ) : (
            <SearchResultsDropdown
              results={results}
              isLoading={isLoading}
              query={query}
              onSelect={handleSelect}
              onClose={() => setIsOpen(false)}
              className="border-none shadow-none"
              maxHeight="max-h-80"
              showImportingState={true}
            />
          )}
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
        {isLoading && results.length === 0 ? (
          <SearchDropdownSkeleton />
        ) : (
          <SearchResultsDropdown
            results={results}
            isLoading={isLoading}
            query={query}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
            className="border-none shadow-none"
            maxHeight="max-h-80"
            showImportingState={true}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

// SearchResultsDropdown component moved to ~/components/search/search-results-dropdown.tsx

UnifiedSearch.displayName = "UnifiedSearch";
