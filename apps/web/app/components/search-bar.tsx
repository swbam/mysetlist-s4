"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { Loader2, Music, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  type SearchResult,
  debounce,
  getSearchResultHref,
  searchContent,
} from "~/lib/search";

interface SearchBarProps {
  variant?: "default" | "hero";
  placeholder?: string;
  className?: string;
}

export const SearchBar = React.memo(
  ({
    variant = "default",
    placeholder = "Search artists...",
    className,
  }: SearchBarProps) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          searchRef.current &&
          !searchRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const performSearch = useCallback(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await searchContent(searchQuery, 8);
        setResults(response.results);
        setIsOpen(true);
      } catch (_error) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, []);

    const debouncedSearch = useCallback(debounce(performSearch, 300), [
      performSearch,
    ]);

    useEffect(() => {
      debouncedSearch(query);
    }, [query, debouncedSearch]);

    const getIcon = (_type: SearchResult["type"]) => {
      // Only artists are searchable now
      return <Music className="h-4 w-4" />;
    };

    return (
      <div
        ref={searchRef}
        className={cn("relative w-full max-w-lg", className)}
      >
        {isLoading && (
          <div id="search-status" className="sr-only" aria-live="polite">
            Searching...
          </div>
        )}
        <div className="relative">
          {isLoading ? (
            <Loader2 className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 animate-spin text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
          ) : (
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
          )}
          <Input
            type="search"
            placeholder={placeholder}
            className={cn(
              "pr-10 pl-10 sm:pl-12",
              variant === "hero" && "h-12 text-base sm:h-14 sm:text-lg",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length > 1 && setIsOpen(true)}
            autoComplete="off"
            inputMode="search"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label="Search for artists"
            aria-describedby={isLoading ? "search-status" : undefined}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-full w-10 sm:w-12"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>

        {isOpen && results.length > 0 && (
          <Card className="absolute top-full z-50 mt-2 max-h-80 w-full overflow-auto border border-border/50 bg-card/95 p-1 shadow-lg backdrop-blur-sm sm:max-h-96 sm:p-2">
            <div
              role="listbox"
              className="space-y-0.5 sm:space-y-1"
              aria-label={`${results.length} search results`}
            >
              {results.map((result, index) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={getSearchResultHref(result)}
                  onClick={async () => {
                    setQuery("");
                    setIsOpen(false);

                    // If this is a Ticketmaster artist that needs sync, trigger it
                    if (
                      result.requiresSync &&
                      result.source === "ticketmaster"
                    ) {
                      try {
                        // Trigger artist import in the background
                        fetch("/api/sync/artist-import", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            ticketmasterId: result.ticketmasterId,
                            name: result.title,
                            imageUrl: result.imageUrl,
                          }),
                        });
                      } catch (error) {
                        console.error("Failed to trigger artist sync:", error);
                      }
                    }
                  }}
                  role="option"
                  aria-selected={false}
                  aria-describedby={`search-result-${index}`}
                >
                  <div
                    id={`search-result-${index}`}
                    className="flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent active:bg-accent/80 sm:gap-3 sm:p-3"
                  >
                    {result.imageUrl ? (
                      <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted sm:h-10 sm:w-10">
                        <Image
                          src={result.imageUrl}
                          alt={result.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {getIcon(result.type)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm sm:text-base">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="truncate text-muted-foreground text-xs sm:text-sm">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {result.meta && (
                        <span className="hidden text-muted-foreground text-xs sm:inline">
                          {result.meta}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {result.type}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
