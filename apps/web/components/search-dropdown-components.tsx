"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { cn } from "@repo/design-system/lib/utils";
import {
  Calendar,
  Disc,
  Loader2,
  MapPin,
  Music,
  Search,
  X,
} from "lucide-react";
import type { RefObject } from "react";

interface SearchResult {
  id: string;
  type: "artist" | "show" | "venue" | "song";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  date?: string;
  verified?: boolean;
  source: "database" | "ticketmaster" | "spotify";
  location?: string;
  artistName?: string;
  venueName?: string;
  externalId?: string;
  requiresSync?: boolean;
  popularity?: number;
  genres?: string[];
}

interface SearchDropdownProps {
  variant: "default" | "hero";
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleSelect: (result: SearchResult) => void;
  clearSearch: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  searched: boolean;
  importingArtistId: string | null;
  inputRef: RefObject<HTMLInputElement>;
}

export default function SearchDropdownComponents({
  variant,
  query,
  setQuery,
  results,
  isLoading,
  isOpen,
  setIsOpen,
  handleSelect,
  clearSearch,
  handleKeyDown,
  placeholder = "Search artists, shows, venues...",
  className,
  searched,
  importingArtistId,
  inputRef,
}: SearchDropdownProps) {
  if (variant === "hero") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className={cn("relative w-full max-w-2xl", className)}>
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-12 border-2 border-primary/20 bg-background/95 pr-12 pl-12 text-base backdrop-blur transition-colors hover:border-primary/30 focus:border-primary/50 supports-[backdrop-filter]:bg-background/80 md:h-14 md:text-lg"
                onFocus={() =>
                  setIsOpen(query.length >= 2 && results.length > 0)
                }
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="-translate-y-1/2 absolute top-1/2 right-2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[90vw] max-w-[600px] p-0 md:w-[600px]"
          align="start"
        >
          <SearchResultsDropdown
            results={results}
            isLoading={isLoading}
            query={query}
            onSelect={handleSelect}
            searched={searched}
            importingArtistId={importingArtistId}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full max-w-md", className)}>
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-10 pl-10"
            onFocus={() => setIsOpen(query.length >= 2 && results.length > 0)}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <SearchResultsDropdown
          results={results}
          isLoading={isLoading}
          query={query}
          onSelect={handleSelect}
          searched={searched}
          importingArtistId={importingArtistId}
        />
      </PopoverContent>
    </Popover>
  );
}

function SearchResultsDropdown({
  results,
  isLoading,
  query,
  onSelect,
  searched,
  importingArtistId,
}: {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (result: SearchResult) => void;
  searched: boolean;
  importingArtistId: string | null;
}) {
  const getResultIcon = (type: string) => {
    switch (type) {
      case "artist":
        return Music;
      case "show":
        return Calendar;
      case "venue":
        return MapPin;
      case "song":
        return Disc;
      default:
        return Search;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case "artist":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "show":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "venue":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "song":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type]!.push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  const typeOrder = ["artist", "show", "venue", "song"];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "artist":
        return "Artists";
      case "show":
        return "Shows";
      case "venue":
        return "Venues";
      case "song":
        return "Songs";
      default:
        return type;
    }
  };

  return (
    <Command shouldFilter={false}>
      <CommandList className="max-h-80">
        {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
        {!isLoading && results.length === 0 && searched && (
          <CommandEmpty>
            <div className="py-4 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No results found for "{query}"
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Try searching for different terms
              </p>
            </div>
          </CommandEmpty>
        )}

        {typeOrder.map((type) => {
          const typeResults = groupedResults[type];
          if (!typeResults?.length) {
            return null;
          }

          return (
            <CommandGroup key={type} heading={getTypeLabel(type)}>
              {typeResults.map((result) => {
                const Icon = getResultIcon(result.type);

                return (
                  <CommandItem
                    key={result.id}
                    onSelect={() =>
                      importingArtistId !== result.id
                        ? onSelect(result)
                        : undefined
                    }
                    className={cn(
                      "flex cursor-pointer items-center gap-3 p-3",
                      importingArtistId === result.id &&
                        "opacity-70 cursor-wait",
                    )}
                  >
                    {result.imageUrl ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.imageUrl} alt={result.title} />
                        <AvatarFallback>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {result.title}
                        </span>
                        {result.verified && (
                          <div className="h-1 w-1 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="truncate text-muted-foreground text-sm">
                          {result.subtitle}
                          {result.date && ` • ${formatDate(result.date)}`}
                        </p>
                      )}
                    </div>

                    {importingArtistId === result.id ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs text-muted-foreground">
                          Importing...
                        </span>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs capitalize",
                          getResultBadgeColor(result.type),
                        )}
                      >
                        {result.type}
                      </Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </Command>
  );
}