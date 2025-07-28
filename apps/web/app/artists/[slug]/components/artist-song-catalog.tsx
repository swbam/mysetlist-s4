"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { Input } from "@repo/design-system/components/ui/input"
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area"
import { Skeleton } from "@repo/design-system/components/ui/skeleton"
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Clock,
  Disc,
  ExternalLink,
  Loader2,
  Music,
  Play,
  Search,
} from "lucide-react"
import Image from "next/image"
import React, { useEffect, useState, useCallback, useMemo } from "react"

interface Song {
  id: string
  title: string
  artist: string
  album: string
  albumArtUrl: string | null
  releaseDate: string | null
  durationMs: number
  popularity: number
  previewUrl: string | null
  isExplicit: boolean
  spotifyId: string | null
}

interface ArtistSongCatalogProps {
  artistId: string
  artistSlug: string
  artistName: string
}

export const ArtistSongCatalog = React.memo(function ArtistSongCatalog({
  artistId: _artistId,
  artistSlug,
  artistName,
}: ArtistSongCatalogProps) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [source, setSource] = useState<string>("")
  const [sortBy, setSortBy] = useState<
    "popularity" | "title" | "album" | "releaseDate"
  >("popularity")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const limit = 20

  useEffect(() => {
    fetchSongs()
  }, [artistSlug])

  useEffect(() => {
    let filtered = songs

    // Apply search filter
    if (searchQuery) {
      filtered = songs.filter(
        (song) =>
          song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.album.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "title": {
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        }
        case "album": {
          aValue = a.album.toLowerCase()
          bValue = b.album.toLowerCase()
          break
        }
        case "releaseDate": {
          aValue = new Date(a.releaseDate || 0)
          bValue = new Date(b.releaseDate || 0)
          break
        }
        default: {
          aValue = a.popularity
          bValue = b.popularity
          break
        }
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    })

    setFilteredSongs(filtered)
  }, [searchQuery, songs, sortBy, sortOrder])

  const fetchSongs = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }

        const currentOffset = loadMore ? offset : 0
        const response = await fetch(
          `/api/artists/${artistSlug}/songs?limit=${limit}&offset=${currentOffset}`
        )

        if (response.ok) {
          const data = await response.json()

          if (loadMore) {
            setSongs((prev) => [...prev, ...data.songs])
          } else {
            setSongs(data.songs)
          }

          setSource(data.source)
          setHasMore(data.songs.length === limit)
          setOffset(currentOffset + data.songs.length)
        }
      } catch (_error) {
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [artistSlug, limit, offset]
  )

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    return `${minutes}:${seconds.padStart(2, "0")}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return "Unknown"
    }
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    })
  }

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchSongs(true)
    }
  }, [loadingMore, hasMore, fetchSongs])

  // Memoize formatted data to prevent re-computation
  const memoizedFilteredSongs = useMemo(() => filteredSongs, [filteredSongs])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Song Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...new Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Song Catalog
              {source && (
                <Badge variant="secondary" className="ml-2">
                  {source === "spotify"
                    ? "From Spotify"
                    : source === "database"
                      ? "Verified"
                      : "Sample Data"}
                </Badge>
              )}
            </CardTitle>
            <span className="text-muted-foreground text-sm">
              {songs.length} songs
            </span>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${artistName}'s songs...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sortBy === "popularity") {
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                  } else {
                    setSortBy("popularity")
                    setSortOrder("desc")
                  }
                }}
                className="gap-1"
              >
                Popular
                {sortBy === "popularity" &&
                  (sortOrder === "desc" ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  ))}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sortBy === "title") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  } else {
                    setSortBy("title")
                    setSortOrder("asc")
                  }
                }}
                className="gap-1"
              >
                A-Z
                {sortBy === "title" &&
                  (sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  ))}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="space-y-1 p-4">
            {memoizedFilteredSongs.map((song, _index) => (
              <div
                key={song.id}
                className="group relative flex items-center gap-3 rounded-lg p-3 transition-all hover:bg-muted/50"
              >
                {/* Album Art */}
                <div className="relative h-16 w-16 overflow-hidden rounded">
                  {song.albumArtUrl ? (
                    <Image
                      src={song.albumArtUrl}
                      alt={song.album}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Disc className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {song.previewUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-white/20 p-0 hover:bg-white/30"
                        onClick={() => {
                          if (playingTrack === song.id) {
                            setPlayingTrack(null)
                          } else {
                            setPlayingTrack(song.id)
                          }
                        }}
                      >
                        <Play className="h-4 w-4 text-white" fill="white" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Song Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{song.title}</p>
                    {song.isExplicit && (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        E
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span className="truncate">{song.album}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(song.releaseDate)}
                    </span>
                  </div>
                </div>

                {/* Duration and Actions */}
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Clock className="h-3 w-3" />
                    {formatDuration(song.durationMs)}
                  </span>

                  {/* Popularity indicator */}
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${song.popularity}%` }}
                      />
                    </div>
                  </div>

                  {song.spotifyId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        window.open(
                          `https://open.spotify.com/track/${song.spotifyId}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Songs"
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
})
