"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system";
import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import { Card, CardContent } from "@repo/design-system";
import { Input } from "@repo/design-system";
import { cn } from "@repo/design-system";
import { Loader2, Music, Search, X } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";

interface Artist {
  tmAttractionId: string;
  name: string;
  image?: string;
  genreHints?: string[];
}

interface SearchResponse {
  query: string;
  results: Artist[];
  totalCount: number;
  timestamp: string;
  error?: string;
}

interface InlineArtistSearchProps {
  onSelect: (artist: Artist) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  maxResults?: number;
  showClearButton?: boolean;
}

export function InlineArtistSearch({
  onSelect,
  placeholder = "Search for artists...",
  className,
  autoFocus = false,
  maxResults = 10,
  showClearButton = true,
}: InlineArtistSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement[]>([]);

  // Debounce the search query
  const debouncedQuery = useDebounce(query, 300);

  // Search function
  const searchArtists = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          q: searchQuery,
          limit: maxResults.toString(),
        });

        const response = await fetch(`/api/search/artists?${searchParams}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || errorData.message || "Search failed",
          );
        }

        const data: SearchResponse = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setResults(data.results);
        setIsOpen(data.results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error("Search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [maxResults],
  );

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    searchArtists(debouncedQuery);
  }, [debouncedQuery, searchArtists]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (
            selectedIndex >= 0 &&
            selectedIndex < results.length &&
            results[selectedIndex]
          ) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, selectedIndex],
  );

  // Handle artist selection
  const handleSelect = useCallback(
    (artist: Artist) => {
      onSelect(artist);
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    },
    [onSelect],
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setError(null);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current[selectedIndex]) {
      resultsRef.current[selectedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
          aria-controls="search-results"
        />

        {/* Loading indicator */}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {/* Clear button */}
        {showClearButton && query && !isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-muted/50"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <Card
          ref={dropdownRef}
          className="absolute top-full z-50 mt-2 w-full max-h-80 overflow-hidden border border-border/50 shadow-lg"
          id="search-results"
          role="listbox"
        >
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {error ? (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  <div className="text-center">
                    <p className="font-medium text-destructive">Search Error</p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  <div className="text-center">
                    <Music className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No artists found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                </div>
              ) : (
                results.map((artist, index) => (
                  <div
                    key={artist.tmAttractionId}
                    ref={(el) => {
                      if (el) resultsRef.current[index] = el;
                    }}
                    role="option"
                    aria-selected={selectedIndex === index}
                    className={cn(
                      "flex items-center space-x-3 p-3 cursor-pointer transition-colors border-b border-border/30 last:border-b-0",
                      selectedIndex === index
                        ? "bg-accent/50 text-accent-foreground"
                        : "hover:bg-muted/30",
                    )}
                    onClick={() => handleSelect(artist)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Artist Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage
                        src={artist.image}
                        alt={artist.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted">
                        <Music className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Artist Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm truncate">
                          {artist.name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          Ticketmaster
                        </Badge>
                      </div>

                      {artist.genreHints && artist.genreHints.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {artist.genreHints.slice(0, 3).map((genre) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className="text-xs h-5 px-1.5"
                            >
                              {genre}
                            </Badge>
                          ))}
                          {artist.genreHints.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{artist.genreHints.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
