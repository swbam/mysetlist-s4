"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import {
  Calendar,
  Clock,
  History,
  MapPin,
  Music,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";

interface SearchSuggestion {
  id: string;
  type:
    | "artist"
    | "show"
    | "venue"
    | "genre"
    | "location"
    | "recent"
    | "trending";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  metadata?: {
    popularity?: number;
    upcomingShows?: number;
    followerCount?: number;
    capacity?: number;
    showDate?: string;
  };
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: SearchSuggestion) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  onSearch,
  placeholder = "Search artists, shows, venues...",
  className,
  disabled,
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const debouncedValue = useDebounce(value, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mysetlist-recent-searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (_error) {}
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = (query: string) => {
    if (!query.trim() || query.length < 2) {
      return;
    }

    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(
      0,
      5,
    );
    setRecentSearches(updated);
    localStorage.setItem("mysetlist-recent-searches", JSON.stringify(updated));
  };

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedValue || debouncedValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(debouncedValue)}&limit=8`,
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (_error) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedValue]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      }
      case "Escape": {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      }
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    onChange(suggestion.title);
    saveRecentSearch(suggestion.title);
    onSelect(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleSearch = () => {
    saveRecentSearch(value);
    onSearch();
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleFocus = () => {
    setShowSuggestions(true);
    if (!value && recentSearches.length > 0) {
      // Show recent searches when focused with empty input
      const recentSuggestions = recentSearches.map((search, index) => ({
        id: `recent-${index}`,
        type: "recent" as const,
        title: search,
        subtitle: "Recent search",
      }));
      setSuggestions(recentSuggestions);
    }
  };

  const handleBlur = (_e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  const getIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "artist":
        return <Music className="h-4 w-4" />;
      case "show":
        return <Calendar className="h-4 w-4" />;
      case "venue":
        return <MapPin className="h-4 w-4" />;
      case "trending":
        return <TrendingUp className="h-4 w-4" />;
      case "recent":
        return <History className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "artist":
        return "default";
      case "show":
        return "secondary";
      case "venue":
        return "outline";
      case "trending":
        return "destructive";
      case "recent":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className="py-6 pr-12 pl-10 text-lg"
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={disabled || !value.trim()}
          className="-translate-y-1/2 absolute top-1/2 right-1 h-8 transform px-3"
        >
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <Card className="absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-auto shadow-lg">
          <CardContent className="p-0">
            {loading && (
              <div className="p-4 text-center text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Searching...
                </div>
              </div>
            )}

            {!loading && suggestions.length === 0 && value && (
              <div className="p-4 text-center text-muted-foreground">
                No suggestions found for "{value}"
              </div>
            )}

            <div ref={suggestionsRef}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border-b p-3 transition-colors last:border-b-0",
                    index === selectedIndex ? "bg-muted" : "hover:bg-muted/50",
                  )}
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {getIcon(suggestion.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate font-medium">
                        {suggestion.title}
                      </span>
                      <Badge
                        variant={getBadgeVariant(suggestion.type)}
                        className="text-xs"
                      >
                        {suggestion.type}
                      </Badge>
                    </div>

                    {suggestion.subtitle && (
                      <p className="truncate text-muted-foreground text-sm">
                        {suggestion.subtitle}
                      </p>
                    )}

                    {suggestion.metadata && (
                      <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
                        {suggestion.metadata.followerCount && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {suggestion.metadata.followerCount.toLocaleString()}
                          </span>
                        )}
                        {suggestion.metadata.upcomingShows && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {suggestion.metadata.upcomingShows} shows
                          </span>
                        )}
                        {suggestion.metadata.capacity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {suggestion.metadata.capacity.toLocaleString()}{" "}
                            capacity
                          </span>
                        )}
                        {suggestion.metadata.showDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {suggestion.metadata.showDate}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {suggestion.type === "trending" && (
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
