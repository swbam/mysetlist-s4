"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { cn } from "@repo/design-system/lib/utils";
import { Calendar, Disc, Filter, MapPin, Music, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
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
  source: "database" | "ticketmaster";
  location?: string;
  artistName?: string;
  venueName?: string;
  requiresSync?: boolean;
}

interface SearchFilters {
  types: string[];
  location: string;
  genre: string;
  dateFrom: string;
  dateTo: string;
}

interface EnhancedSearchProps {
  className?: string;
  showFilters?: boolean;
  placeholder?: string;
}

export function EnhancedSearch({
  className,
  showFilters = true,
  placeholder = "Search artists, shows, venues, songs...",
}: EnhancedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    types: searchParams.get("types")?.split(",") || [
      "artist",
      "show",
      "venue",
      "song",
    ],
    location: searchParams.get("location") || "",
    genre: searchParams.get("genre") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  });

  const debouncedQuery = useDebounce(query, 500);

  const performSearch = useCallback(
    async (searchQuery: string, searchFilters = filters) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: "20",
          types: searchFilters.types.join(","),
        });

        if (searchFilters.location)
          params.set("location", searchFilters.location);
        if (searchFilters.genre) params.set("genre", searchFilters.genre);
        if (searchFilters.dateFrom)
          params.set("dateFrom", searchFilters.dateFrom);
        if (searchFilters.dateTo) params.set("dateTo", searchFilters.dateTo);

        // Use the general search endpoint (now using Ticketmaster API consistently)
        const response = await fetch(`/api/search?${params}`);
        const data = await response.json();

        if (response.ok) {
          setResults(data.results || []);
          setHasSearched(true);

          // Update URL with search params
          const newParams = new URLSearchParams({
            q: searchQuery,
            ...Object.fromEntries(
              Object.entries(searchFilters).filter(([_, value]) =>
                Array.isArray(value) ? value.length > 0 : value,
              ),
            ),
            types: searchFilters.types.join(","),
          });

          router.replace(`/search?${newParams.toString()}`, { scroll: false });
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, router],
  );

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [debouncedQuery, performSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    if (query.length >= 2) {
      performSearch(query, newFilters);
    }
  };

  const clearFilters = () => {
    const defaultFilters = {
      types: ["artist", "show", "venue", "song"],
      location: "",
      genre: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(defaultFilters);

    if (query.length >= 2) {
      performSearch(query, defaultFilters);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case "artist":
        router.push(`/artists/${result.slug || result.id}`);
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
  };

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

  const getTypeBadgeColor = (type: string) => {
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

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type]?.push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  const activeFiltersCount =
    [filters.location, filters.genre, filters.dateFrom, filters.dateTo].filter(
      Boolean,
    ).length + (filters.types.length < 4 ? 1 : 0);

  const genreOptions = [
    "Rock",
    "Pop",
    "Jazz",
    "Blues",
    "Country",
    "Electronic",
    "Hip Hop",
    "R&B",
    "Folk",
    "Classical",
    "Reggae",
    "Punk",
    "Metal",
    "Alternative",
  ];

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Search Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-4"
          />
        </div>

        {showFilters && (
          <Popover open={showFiltersPanel} onOpenChange={setShowFiltersPanel}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
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
                    onClick={clearFilters}
                    className="h-auto p-0 text-xs"
                  >
                    Clear all
                  </Button>
                </div>

                <Separator />

                {/* Content Types */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Content Types</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "artist", label: "Artists" },
                      { value: "show", label: "Shows" },
                      { value: "venue", label: "Venues" },
                      { value: "song", label: "Songs" },
                    ].map((type) => (
                      <div
                        key={type.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={type.value}
                          checked={filters.types.includes(type.value)}
                          onCheckedChange={(checked) => {
                            const newTypes = checked
                              ? [...filters.types, type.value]
                              : filters.types.filter((t) => t !== type.value);
                            handleFilterChange("types", newTypes);
                          }}
                        />
                        <Label htmlFor={type.value} className="text-sm">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={filters.location}
                    onChange={(e) =>
                      handleFilterChange("location", e.target.value)
                    }
                    placeholder="City, State, Country"
                  />
                </div>

                {/* Genre */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Genre</Label>
                  <Select
                    value={filters.genre}
                    onValueChange={(value) =>
                      handleFilterChange("genre", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any genre</SelectItem>
                      {genreOptions.map((genre) => (
                        <SelectItem key={genre} value={genre.toLowerCase()}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) =>
                          handleFilterChange("dateFrom", e.target.value)
                        }
                        placeholder="From"
                      />
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) =>
                          handleFilterChange("dateTo", e.target.value)
                        }
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.types.length < 4 && (
            <Badge variant="secondary" className="gap-1">
              Types: {filters.types.join(", ")}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() =>
                  handleFilterChange("types", [
                    "artist",
                    "show",
                    "venue",
                    "song",
                  ])
                }
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="gap-1">
              Location: {filters.location}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => handleFilterChange("location", "")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.genre && (
            <Badge variant="secondary" className="gap-1">
              Genre: {filters.genre}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => handleFilterChange("genre", "")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              Date: {filters.dateFrom || "..."} to {filters.dateTo || "..."}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => {
                  handleFilterChange("dateFrom", "");
                  handleFilterChange("dateTo", "");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-6">
        {isLoading && (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-2 text-muted-foreground">Searching...</p>
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="py-12 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {!isLoading &&
          results.length > 0 &&
          ["artist", "show", "venue", "song"].map((type) => {
            const typeResults = groupedResults[type];
            if (!typeResults?.length) return null;

            const typeLabels = {
              artist: "Artists",
              show: "Shows",
              venue: "Venues",
              song: "Songs",
            };

            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(getResultIcon(type), {
                      className: "h-5 w-5",
                    })}
                    {typeLabels[type as keyof typeof typeLabels]} (
                    {typeResults.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {typeResults.map((result) => {
                      const Icon = getResultIcon(result.type);
                      return (
                        <div
                          key={result.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>

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
                              <p className="truncate text-sm text-muted-foreground">
                                {result.subtitle}
                              </p>
                            )}
                          </div>

                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              getTypeBadgeColor(result.type),
                            )}
                          >
                            {result.type}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
