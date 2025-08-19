"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type SearchResultItem,
  SearchResultsDropdown,
} from "~/components/search/search-results-dropdown";
import { useDebounce } from "~/hooks/use-debounce";

interface LiteSearchProps {
  placeholder?: string;
  className?: string;
  onResultSelect?: (result: SearchResultItem) => void;
}

export function LiteSearch({
  placeholder = "Search artists...",
  className,
  onResultSelect,
}: LiteSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const prefetchedIdsRef = useRef<Set<string>>(new Set());

  // Handle search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
    }
  }, [debouncedQuery]);

  // Predictive prefetch: background import likely artists from Ticketmaster
  useEffect(() => {
    if (!results || results.length === 0) return;
    // Pick top 3 likely results that require sync
    const candidates = results
      .filter((r) => r.type === "artist" && (r.requiresSync || r.source === "ticketmaster"))
      .slice(0, 3);

    if (candidates.length === 0) return;

    candidates.forEach((cand) => {
      const key = cand.externalId || cand.id;
      if (!key || prefetchedIdsRef.current.has(key)) return;
      prefetchedIdsRef.current.add(key);
      // Fire-and-forget background auto-import
      fetch("/api/artists/auto-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmAttractionId: key }),
      }).catch(() => {
        /* ignore */
      });
    });
  }, [results]);

  // Handle clicks outside to close dropdown
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    setHasSearched(false);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`,
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      // Transform API response to SearchResultItem format
      const searchResults: SearchResultItem[] = (data.results || []).map(
        // biome-ignore lint/suspicious/noExplicitAny: API response type
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
      setIsOpen(true);
      setHasSearched(true);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleResultSelect = async (result: SearchResultItem) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      // If no custom handler, navigate to artist page and trigger import
      try {
        // Generate slug from artist name
        const slug = result.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        // Navigate to artist page
        router.push(`/artists/${slug}`);

        // Trigger artist import in background
        fetch("/api/artists/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmAttractionId: result.externalId || result.id.replace("tm_", ""),
          }),
        }).catch((error) => {
          console.error("Background import trigger failed:", error);
        });
      } catch (error) {
        console.error("Navigation error:", error);
      }
    }

    // Clear search and close dropdown
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-lg", className)}>
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          className="pr-20 pl-10 sm:pl-12 h-12 text-base sm:h-14 sm:text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          autoComplete="off"
          inputMode="search"
          aria-label="Search for artists"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />

        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute top-1/2 right-12 -translate-y-1/2 h-8 w-8 p-0 sm:right-14"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          className="absolute top-1/2 right-1 -translate-y-1/2 h-10 sm:h-12"
          onClick={() => {
            if (query.trim()) {
              performSearch(query);
            }
          }}
          disabled={!query.trim() || isLoading}
        >
          Search
        </Button>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2">
          <SearchResultsDropdown
            results={results}
            isLoading={isLoading}
            query={query}
            onSelect={handleResultSelect}
            onClose={() => setIsOpen(false)}
            emptyStateText="No artists found"
            maxHeight="max-h-96"
          />
        </div>
      )}
    </div>
  );
}
