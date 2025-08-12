"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { Music, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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

  const handleResultSelect = async (result: SearchResultItem) => {
    if (onSelect) {
      onSelect(result);
      return;
    }

    try {
      // Generate slug from artist name for Ticketmaster artists
      const slug = result.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      
      // Navigate instantly to artist page with Ticketmaster ID for background sync
      router.push(`/artists/${slug}?ticketmaster=${result.externalId || result.id.replace("tm_", "")}`);
      
      // Trigger background sync after navigation
      fetch("/api/sync/artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketmasterId: result.externalId || result.id.replace("tm_", ""),
          artistName: result.title,
          syncType: "full",
        }),
      }).catch((error) => {
        console.error("Background sync trigger failed:", error);
        // Silent fail - user still gets navigation
      });

      // Close dropdown after navigation
      onClose?.();
    } catch (error) {
      console.error("Navigation error:", error);
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
                className="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-accent"
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

                {/* No action buttons - clicking anywhere navigates */}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}