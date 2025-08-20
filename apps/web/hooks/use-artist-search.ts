"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";

interface SearchResult {
  id: string;
  type: "artist";
  name: string;
  imageUrl?: string;
  description?: string;
  metadata?: {
    slug?: string;
    popularity?: number;
    genres?: string[];
    source: "ticketmaster";
    externalId: string;
  };
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalCount: number;
  timestamp: string;
}

interface UseArtistSearchOptions {
  debounceMs?: number;
  enablePreWarming?: boolean;
  onArtistSelect?: (artist: SearchResult) => void;
  autoNavigate?: boolean;
}

export function useArtistSearch({
  debounceMs = 300,
  enablePreWarming = true,
  onArtistSelect,
  autoNavigate = true,
}: UseArtistSearchOptions = {}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  // Search function - keeps GET /api/search idempotent
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: SearchResponse = await response.json();

      setResults(data.results || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pre-warming function - POST to /import on hover/focus
  const preWarmArtist = useCallback(
    async (tmAttractionId: string) => {
      if (!enablePreWarming) return;

      try {
        // Fire and forget - don't wait for completion
        fetch("/api/artists/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tmAttractionId,
          }),
        }).catch(() => {
          // Silently handle pre-warming errors
        });
      } catch {
        // Silently handle pre-warming errors
      }
    },
    [enablePreWarming],
  );

  // Artist selection handler
  const selectArtist = useCallback(
    async (artist: SearchResult) => {
      if (onArtistSelect) {
        onArtistSelect(artist);
        return;
      }

      if (!autoNavigate) return;

      try {
        setIsLoading(true);

        // Import artist to get proper database slug
        const importResponse = await fetch("/api/artists/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmAttractionId: artist.metadata?.externalId,
          }),
        });

        if (importResponse.ok) {
          const importData = await importResponse.json();
          const slug = importData.slug || artist.metadata?.slug;

          if (slug) {
            router.push(`/artists/${slug}`);
            return;
          }
        }

        // Fallback to generated slug
        const fallbackSlug = artist.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        router.push(`/artists/${fallbackSlug}`);
      } catch (error) {
        console.error("Failed to navigate to artist:", error);
        setError("Failed to navigate to artist");
      } finally {
        setIsLoading(false);
      }
    },
    [onArtistSelect, autoNavigate, router],
  );

  // Effect to trigger search on debounced query change
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setHasSearched(false);
      setError(null);
    }
  }, [debouncedQuery, performSearch]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setError(null);
  }, []);

  return {
    // State
    query,
    results,
    isLoading,
    hasSearched,
    error,

    // Actions
    setQuery,
    selectArtist,
    preWarmArtist,
    clearSearch,
    performSearch,

    // Computed
    hasResults: results.length > 0,
    showNoResults: hasSearched && results.length === 0 && !isLoading,
  };
}
