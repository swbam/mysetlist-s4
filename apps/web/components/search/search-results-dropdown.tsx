"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { Loader2, Music, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface SearchResultItem {
  id: string;
  type: "artist";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  source?: "database" | "ticketmaster";
  requiresSync?: boolean;
  externalId?: string;
  popularity?: number;
  genres?: string[];
}

interface SearchResultsDropdownProps {
  results: SearchResultItem[];
  isLoading: boolean;
  query: string;
  onSelect?: (result: SearchResultItem) => void;
  onClose?: () => void;
  className?: string;
  emptyStateText?: string;
  maxHeight?: string;
  showImportingState?: boolean;
}

export function SearchResultsDropdown({
  results,
  isLoading,
  query,
  onSelect,
  onClose,
  className,
  emptyStateText = "No artists found",
  maxHeight = "max-h-80",
  showImportingState = true,
}: SearchResultsDropdownProps) {
  const router = useRouter();
  const [importingArtistId, setImportingArtistId] = useState<string | null>(null);

  const handleResultSelect = async (result: SearchResultItem) => {
    if (importingArtistId === result.id) {
      return; // Already importing
    }

    if (onSelect) {
      onSelect(result);
      return;
    }

    try {
      if (showImportingState) {
        setImportingArtistId(result.id);
      }

      // Handle navigation based on source
      if (result.source === "ticketmaster" && result.requiresSync !== false) {
        // For Ticketmaster artists that need syncing, navigate with ticketmaster ID
        const slug = result.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        
        router.push(`/artists/${slug}?ticketmaster=${result.externalId || result.id}`);
      } else if (result.slug) {
        // For database artists with slug, use direct navigation
        router.push(`/artists/${result.slug}`);
      } else {
        // Fallback to ID-based navigation
        router.push(`/artists/${result.id}`);
      }

      // Close dropdown after navigation
      onClose?.();
    } catch (error) {
      console.error("Navigation error:", error);
    } finally {
      if (showImportingState) {
        setImportingArtistId(null);
      }
    }
  };

  return (
    <Card className={cn("border border-border/50 bg-card/95 shadow-lg backdrop-blur-sm", className)}>
      <CardContent className={cn("p-1", maxHeight, "overflow-auto")}>
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Searching...</span>
          </div>
        )}

        {!isLoading && results.length === 0 && query.length >= 2 && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="font-medium text-sm">{emptyStateText}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching for "{query}" with different spellings
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-1">
            {results.map((result) => (
              <div
                key={`${result.source}-${result.id}`}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-accent",
                  importingArtistId === result.id && "opacity-70 cursor-wait"
                )}
                onClick={() => handleResultSelect(result)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={result.imageUrl} alt={result.title} />
                  <AvatarFallback>
                    <Music className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    {result.source === "ticketmaster" && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Ticketmaster
                      </Badge>
                    )}
                  </div>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {result.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {showImportingState && importingArtistId === result.id ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-auto p-1 text-xs">
                      {result.source === "ticketmaster" ? "Import" : "View"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}