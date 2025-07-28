"use client";

import { SearchBox } from "@repo/design-system";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Clock, Search, SlidersHorizontal, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { InfiniteScroll } from "~/components/ui/infinite-scroll";
import { PullToRefresh } from "~/components/ui/pull-to-refresh";
import { SearchResultCard } from "./search-result-card";

interface RecentSearch {
  id: string;
  query: string;
  timestamp: Date;
  type?: "artist" | "show" | "venue";
}

interface TrendingQuery {
  id: string;
  query: string;
  count: number;
  category: string;
}

interface SearchFilter {
  type: "all" | "artist" | "show" | "venue";
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: string;
  genre?: string[];
}

interface MobileSearchInterfaceProps {
  onSearch?: (query: string, filters?: SearchFilter) => void;
  onFilterChange?: (filters: SearchFilter) => void;
  isLoading?: boolean;
  results?: any[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function MobileSearchInterface({
  onSearch,
  onFilterChange,
  isLoading = false,
  results = [],
  hasMore = false,
  onLoadMore,
  className,
}: MobileSearchInterfaceProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [trendingQueries, setTrendingQueries] = useState<TrendingQuery[]>([]);
  const [filters, setFilters] = useState<SearchFilter>({ type: "all" });

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recent-searches");
    if (stored) {
      try {
        const parsed = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setRecentSearches(parsed.slice(0, 5)); // Limit to 5 recent searches
      } catch (_error) {}
    }

    // Mock trending queries - in real app, fetch from API
    setTrendingQueries([
      { id: "1", query: "Taylor Swift", count: 1250, category: "Artist" },
      { id: "2", query: "The Weeknd", count: 980, category: "Artist" },
      {
        id: "3",
        query: "Madison Square Garden",
        count: 756,
        category: "Venue",
      },
      { id: "4", query: "Coachella 2024", count: 642, category: "Show" },
      { id: "5", query: "Billie Eilish", count: 589, category: "Artist" },
    ]);
  }, []);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      return;
    }

    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      query: searchQuery.trim(),
      timestamp: new Date(),
    };

    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.query.toLowerCase() !== searchQuery.toLowerCase(),
      );
      const updated = [newSearch, ...filtered].slice(0, 5);

      localStorage.setItem("recent-searches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        return;
      }

      saveRecentSearch(searchQuery);
      onSearch?.(searchQuery, filters);
      setIsSearchExpanded(false);
    },
    [onSearch, filters, saveRecentSearch],
  );

  const handleFilterChange = useCallback(
    (newFilters: SearchFilter) => {
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [onFilterChange],
  );

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recent-searches");
  };

  const removeRecentSearch = (id: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("recent-searches", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRefresh = async () => {
    // Refresh functionality would need to be handled differently
    // since we don't track query state anymore
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate refresh
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Search Header */}
      <div className="sticky top-0 z-40 border-border border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="flex-1">
            <SearchBox
              placeholder="Search artists, shows, venues..."
              onSearch={async (query) => {
                // Convert the sync onSearch to async for SearchBox
                onSearch?.(query, filters);
                // Return empty results as this is handled elsewhere
                return [];
              }}
              onSelect={(_result) => {
                // Handle selection if needed
              }}
              onSubmit={(query) => {
                onSearch?.(query, filters);
              }}
              className="mobile-text-enhance w-full"
              autoFocus={isSearchExpanded}
            />
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "min-h-[40px] min-w-[40px] p-2",
              showFilters && "bg-primary text-primary-foreground",
            )}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Filters */}
        {showFilters && (
          <div className="animate-slide-up space-y-3 px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "artist", "show", "venue"] as const).map((type) => (
                <Button
                  key={type}
                  variant={filters.type === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange({ ...filters, type })}
                  className="touch-manipulation capitalize"
                >
                  {type === "all" ? "All" : `${type}s`}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Content */}
      <div className="flex-1 overflow-hidden">
        {isSearchExpanded ? (
          /* Search Suggestions */
          <div className="space-y-6 p-4">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-muted-foreground text-xs hover:text-foreground"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2">
                  {recentSearches.map((search) => (
                    <div
                      key={search.id}
                      className="flex touch-manipulation items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                    >
                      <button
                        onClick={() => handleSearch(search.query)}
                        className="flex-1 text-left text-sm"
                      >
                        {search.query}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecentSearch(search.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${search.query} from recent searches`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                Trending Now
              </h3>

              <div className="space-y-2">
                {trendingQueries.map((trending) => (
                  <button
                    key={trending.id}
                    onClick={() => handleSearch(trending.query)}
                    className="flex w-full touch-manipulation items-center justify-between rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {trending.query}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {trending.count.toLocaleString()} searches
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {trending.category}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : results.length > 0 ? (
          /* Search Results */
          <PullToRefresh onRefresh={handleRefresh}>
            <InfiniteScroll
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={onLoadMore || (() => {})}
              className="space-y-4 p-4"
            >
              {results.map((result, index) => (
                <div key={result.id || index} className="animate-fade-in">
                  <SearchResultCard result={result} />
                </div>
              ))}
            </InfiniteScroll>
          </PullToRefresh>
        ) : !isLoading && !isSearchExpanded ? (
          /* No Results */
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-medium text-lg">No results found</h3>
            <p className="mb-4 text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : isLoading ? (
          /* Loading State */
          <div className="space-y-4 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
