"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const UnifiedSearch = dynamic(() => import("~/components/unified-search").then(mod => ({ default: mod.UnifiedSearch })), {
  loading: () => (
    <div className="flex items-center justify-center h-10 border rounded-md">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  ),
  ssr: false,
});

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
