"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system";
import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system";
import { Input } from "@repo/design-system";
import { Music, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebounce } from "~/hooks/use-debounce";

interface Artist {
  tmAttractionId: string;
  name: string;
  image?: string;
  genreHints?: string[];
}

export function ShowsSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 500);

  const searchArtists = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Always search for artists only via Ticketmaster API
      const response = await fetch(
        `/api/search/artists?q=${encodeURIComponent(searchQuery)}&limit=8`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Failed to search artists");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectArtist = (artist: Artist) => {
    // Create slug from artist name
    const slug = artist.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Navigate to artist page
    router.push(`/artists/${slug}`);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setError(null);
  };

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchArtists(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pl-10 pr-10 text-lg"
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
        {isLoading && (
          <div className="-translate-y-1/2 absolute top-1/2 right-8 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Found {results.length} artist{results.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3">
            {results.map((artist) => (
              <Card
                key={artist.tmAttractionId}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => handleSelectArtist(artist)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    {/* Artist Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={artist.image}
                        alt={artist.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/10">
                        <Music className="h-6 w-6 text-primary" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {artist.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-xs flex-shrink-0"
                        >
                          Artist
                        </Badge>
                      </div>

                      {/* Genres */}
                      {artist.genreHints && artist.genreHints.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {artist.genreHints.slice(0, 3).map((genre) => (
                            <Badge
                              key={genre}
                              variant="secondary"
                              className="text-xs"
                            >
                              {genre}
                            </Badge>
                          ))}
                          {artist.genreHints.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{artist.genreHints.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Button size="sm" variant="default">
                      View Artist
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {query && !isLoading && results.length === 0 && (
        <div className="py-8 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No artists found</h3>
          <p className="text-muted-foreground text-sm">
            No artists found for "{query}". Try searching for different artist
            names.
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            Example searches: "Taylor Swift", "The Beatles", "Arctic Monkeys"
          </p>
        </div>
      )}

      {!query && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-lg">Search for Artists</h3>
          <p className="text-muted-foreground text-sm">
            Find artists and view their upcoming shows and setlists
          </p>
        </div>
      )}
    </div>
  );
}
