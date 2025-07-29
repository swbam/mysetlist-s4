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
  type: "artist" | "show" | "venue" | "song";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug: string;
  metadata?: {
    date?: string;
    location?: string;
    genre?: string;
  };
}

interface SearchFilters {
  type: "all" | "artist" | "show" | "venue" | "song";
  dateRange?: {
    start: string;
    end: string;
  };
  location?: string;
  genre?: string;
}

interface EnhancedSearchProps {
  placeholder?: string;
  showFilters?: boolean;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function EnhancedSearch({
  placeholder = "Search artists, shows, venues...",
  showFilters = true,
  onResultSelect,
  className = "",
}: EnhancedSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ type: "all" });
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
          ...(searchFilters.type !== "all" && { type: searchFilters.type }),
          ...(searchFilters.location && { location: searchFilters.location }),
          ...(searchFilters.genre && { genre: searchFilters.genre }),
          ...(searchFilters.dateRange?.start && {
            startDate: searchFilters.dateRange.start,
          }),
          ...(searchFilters.dateRange?.end && {
            endDate: searchFilters.dateRange.end,
          }),
        });

        const response = await fetch(`/api/search?${params}`);
        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();
        setResults(data.results || []);
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
        // Default navigation behavior
        switch (result.type) {
          case "artist":
            router.push(`/artists/${result.slug}`);
            break;
          case "show":
            router.push(`/shows/${result.slug}`);
            break;
          case "venue":
            router.push(`/venues/${result.slug}`);
            break;
          default:
            break;
        }
      }
    },
    [onResultSelect, router],
  );

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case "artist":
        return <Music className="h-4 w-4" />;
      case "show":
        return <Calendar className="h-4 w-4" />;
      case "venue":
        return <MapPin className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.type !== "all") count++;
    if (filters.location) count++;
    if (filters.genre) count++;
    if (filters.dateRange) count++;
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
                          {result.metadata && (
                            <div className="flex gap-2 mt-1">
                              {result.metadata.date && (
                                <span className="text-xs text-muted-foreground">
                                  {result.metadata.date}
                                </span>
                              )}
                              {result.metadata.location && (
                                <span className="text-xs text-muted-foreground">
                                  {result.metadata.location}
                                </span>
                              )}
                            </div>
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
                    onClick={() => setFilters({ type: "all" })}
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {["all", "artist", "show", "venue", "song"].map((type) => (
                      <Button
                        key={type}
                        variant={filters.type === type ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, type: type as any }))
                        }
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="City, State"
                    value={filters.location || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        location: e.target.value || undefined,
                      }))
                    }
                  />
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
          {filters.type !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {filters.type}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFilters((prev) => ({ ...prev, type: "all" }))}
              />
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Location: {filters.location}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, location: undefined }))
                }
              />
            </Badge>
          )}
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
