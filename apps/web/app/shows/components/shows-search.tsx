"use client"

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert"
import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/components/ui/card"
import { Input } from "@repo/design-system/components/ui/input"
import { Calendar, MapPin, Music, Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useDebounce } from "~/hooks/use-debounce"

interface Show {
  id: string
  name: string
  slug: string
  date: string
  artistName?: string
  venueName?: string
  location?: string
  imageUrl?: string
  status?: string
}

export function ShowsSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Show[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debouncedQuery = useDebounce(query, 500)

  const searchShows = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        types: "show",
        limit: "10",
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Search failed")
      }

      // Filter only show results
      const showResults = (data.results || [])
        .filter((result: any) => result.type === "show")
        .map((result: any) => ({
          id: result.id,
          name: result.title,
          slug: result.slug || result.id,
          date: result.date,
          artistName: result.artistName,
          venueName: result.venueName,
          location: result.location,
          imageUrl: result.imageUrl,
          status: "upcoming",
        }))

      setResults(showResults)
    } catch (err: any) {
      setError(err.message || "Failed to search shows")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectShow = (show: Show) => {
    router.push(`/shows/${show.slug}`)
  }

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setError(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchShows(debouncedQuery)
    } else {
      setResults([])
    }
  }, [debouncedQuery])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for shows, artists, or venues..."
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
            Found {results.length} show{results.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3">
            {results.map((show) => (
              <Card
                key={show.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => handleSelectShow(show)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {show.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-xs flex-shrink-0"
                        >
                          Show
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {show.artistName && (
                          <div className="flex items-center gap-1">
                            <Music className="h-3 w-3" />
                            <span className="truncate">{show.artistName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          {show.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(show.date)}</span>
                            </div>
                          )}
                          {show.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{show.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="default">
                      View Show
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
          <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No shows found</h3>
          <p className="text-muted-foreground text-sm">
            No shows found for "{query}". Try searching for artist names,
            venues, or locations.
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            Example searches: "Taylor Swift", "Madison Square Garden", "New
            York"
          </p>
        </div>
      )}

      {!query && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-lg">Search for Shows</h3>
          <p className="text-muted-foreground text-sm">
            Find upcoming concerts by searching for artists, venues, or
            locations
          </p>
        </div>
      )}
    </div>
  )
}
