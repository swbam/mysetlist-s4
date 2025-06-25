'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@repo/design-system/components/ui/input';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { 
  Search, 
  Music, 
  Calendar, 
  MapPin, 
  Clock, 
  TrendingUp,
  History,
  Star,
  Users
} from 'lucide-react';
import { cn } from '@repo/design-system/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchSuggestion {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'genre' | 'location' | 'recent' | 'trending';
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
  disabled
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
    const saved = localStorage.getItem('mysetlist-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = (query: string) => {
    if (!query.trim() || query.length < 2) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('mysetlist-recent-searches', JSON.stringify(updated));
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
          `/api/search/suggestions?q=${encodeURIComponent(debouncedValue)}&limit=8`
        );
        
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedValue]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
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
        type: 'recent' as const,
        title: search,
        subtitle: 'Recent search',
      }));
      setSuggestions(recentSuggestions);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  const getIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'artist': return <Music className="h-4 w-4" />;
      case 'show': return <Calendar className="h-4 w-4" />;
      case 'venue': return <MapPin className="h-4 w-4" />;
      case 'trending': return <TrendingUp className="h-4 w-4" />;
      case 'recent': return <History className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'artist': return 'default';
      case 'show': return 'secondary';
      case 'venue': return 'outline';
      case 'trending': return 'destructive';
      case 'recent': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          className="pl-10 pr-12 text-lg py-6"
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={disabled || !value.trim()}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-3"
        >
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-auto shadow-lg">
          <CardContent className="p-0">
            {loading && (
              <div className="p-4 text-center text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
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
                    "flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 transition-colors",
                    index === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                  )}
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted">
                    {getIcon(suggestion.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {suggestion.title}
                      </span>
                      <Badge variant={getBadgeVariant(suggestion.type)} className="text-xs">
                        {suggestion.type}
                      </Badge>
                    </div>
                    
                    {suggestion.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {suggestion.subtitle}
                      </p>
                    )}
                    
                    {suggestion.metadata && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                            {suggestion.metadata.capacity.toLocaleString()} capacity
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

                  {suggestion.type === 'trending' && (
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