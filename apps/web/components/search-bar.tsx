"use client";

import { UnifiedSearch } from "~/components/unified-search";

interface SearchFilters {
  types: string[];
  location: string;
  genre: string;
  dateFrom: string;
  dateTo: string;
}

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  variant?: "default" | "hero" | "artists-only";
  showFilters?: boolean;
  defaultFilters?: Partial<SearchFilters>;
}

export function SearchBar({
  placeholder = "Search artists, shows, venues...",
  className,
  variant = "default",
  showFilters = false,
  defaultFilters,
}: SearchBarProps) {
  return (
    <UnifiedSearch
      placeholder={placeholder}
      className={className}
      variant={variant}
      showFilters={showFilters}
      limit={8}
    />
  );
}

SearchBar.displayName = "SearchBar";
