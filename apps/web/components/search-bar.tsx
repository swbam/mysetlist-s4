'use client';

import { UnifiedSearch } from '~/components/unified-search';

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
  variant?: 'default' | 'hero';
  showFilters?: boolean;
  defaultFilters?: Partial<SearchFilters>;
}

export function SearchBar({
  placeholder = 'Search artists...',
  className,
  variant = 'default',
  showFilters = false,
  defaultFilters,
}: SearchBarProps) {
  return (
    <UnifiedSearch
      placeholder={placeholder}
      className={className}
      variant="artists-only"
      showFilters={showFilters}
      limit={8}
    />
  );
}

SearchBar.displayName = 'SearchBar';
