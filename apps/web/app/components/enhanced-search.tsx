"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { Calendar, Filter, MapPin, Music, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";

interface SearchResult {
  id: string;
  type: "artist"; // Only artists are searchable per PRD requirements
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  source?: "database" | "ticketmaster";
  requiresSync?: boolean;
  externalId?: string;
  popularity?: number;
  genres?: string[];
}

interface SearchFilters {
  genre?: string;
}

interface EnhancedSearchProps {
  placeholder?: string;
  showFilters?: boolean;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function EnhancedSearch({
  placeholder = "Search artists...",
  showFilters = true,
  onResultSelect,
  className = "",
}: EnhancedSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  // Search function with filters
  const performSearch = useCallback(
    async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: "10",
          ...(searchFilters.genre && { genre: searchFilters.genre }),
        });

        const response = await fetch(`/api/search?${params}`);
        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();
        // Transform API response to SearchResult format
        const searchResults: SearchResult[] = (data.results || []).map(
          (result: any) => ({
            id: result.id,
            type: "artist" as const,
            title: result.name,
            subtitle: result.description,
            imageUrl: result.imageUrl,
            slug: result.metadata?.slug,
            source: result.metadata?.source || "database",
            requiresSync: result.metadata?.source === "ticketmaster",
            externalId: result.metadata?.externalId,
            popularity: result.metadata?.popularity,
            genres: result.metadata?.genres,
          }),
        );
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Trigger search when query or filters change
  useEffect(() => {
    performSearch(debouncedQuery, filters);
  }, [debouncedQuery, filters, performSearch]);

  // Handle result selection
  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery("");

      if (onResultSelect) {
        onResultSelect(result);
      } else {
        // Only artists are searchable now
        if (result.type === "artist") {
          // Handle navigation based on source
          if (
            result.source === "ticketmaster" &&
            result.requiresSync !== false
          ) {
            // For Ticketmaster artists that need syncing, navigate with ticketmaster ID
            const slug = result.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            router.push(
              `/artists/${slug}?ticketmaster=${result.externalId || result.id}`,
            );
          } else if (result.slug) {
            // For database artists with slug, use direct navigation
            router.push(`/artists/${result.slug}`);
          } else {
            // Fallback to ID-based navigation
            router.push(`/artists/${result.id}`);
          }
        }
      }
    },
    [onResultSelect, router],
  );

  // Get icon for result type (now only artist)
  const getResultIcon = (type: string) => {
    return <Music className="h-4 w-4" />;
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.genre) count++;
    return count;
  }, [filters]);

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
                className="pl-10 pr-4"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[400px] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput
                placeholder={placeholder}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {isLoading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                )}
                {!isLoading && results.length === 0 && query.length >= 2 && (
                  <CommandEmpty>No results found.</CommandEmpty>
                )}
                {!isLoading && results.length > 0 && (
                  <CommandGroup>
                    {results.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultSelect(result)}
                        className="flex items-center gap-3 p-3"
                      >
                        <div className="flex-shrink-0">
                          {result.imageUrl ? (
                            <img
                              src={result.imageUrl}
                              alt={result.title}
                              className="h-8 w-8 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                              {getResultIcon(result.type)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {result.title}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {result.type}
                            </Badge>
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {showFilters && (
          <Popover open={showFilterPanel} onOpenChange={setShowFilterPanel}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Search Filters</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({})}
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Genre</label>
                  <Input
                    placeholder="Rock, Pop, Jazz..."
                    value={filters.genre || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        genre: e.target.value || undefined,
                      }))
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.genre && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Genre: {filters.genre}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, genre: undefined }))
                }
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
