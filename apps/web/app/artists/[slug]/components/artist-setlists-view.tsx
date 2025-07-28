"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { Calendar, ExternalLink, MapPin, Music2, Vote } from "lucide-react"
import Link from "next/link"
import { formatDate } from "~/lib/utils"

interface Setlist {
  setlist: {
    id: string
    name: string
    artistId: string
    showId: string
    isLocked: boolean
    createdAt: string
  }
  show?: {
    id: string
    name: string
    slug: string
    date: string
  }
  venue?: {
    id: string
    name: string
    city: string
    state?: string
    country: string
  }
  songCount: number
  voteCount: number
}

interface ArtistSetlistsViewProps {
  setlists: Setlist[]
  artistName: string
  artistId: string
}

export function ArtistSetlistsView({
  setlists,
  artistName,
  artistId: _artistId,
}: ArtistSetlistsViewProps) {
  if (setlists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artist Setlists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Music2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              No setlists found for {artistName}
            </p>
            <p className="text-sm text-muted-foreground">
              Setlists will appear here when fans create them for upcoming shows
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Recent Setlists
          </CardTitle>
          <Badge variant="secondary">{setlists.length} setlists</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {setlists.map(({ setlist, show, venue, songCount, voteCount }) => (
            <div
              key={setlist.id}
              className="group flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex-1 space-y-2">
                <div>
                  <Link
                    href={`/setlists/${show?.id || setlist.showId}`}
                    className="font-semibold hover:underline"
                  >
                    {setlist.name || `${artistName} Setlist`}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(setlist.createdAt)}</span>
                    {setlist.isLocked && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          Locked
                        </Badge>
                      </>
                    )}
                  </div>
                  {show && (
                    <div className="mt-1 text-muted-foreground text-sm">
                      Show: {show.name}
                    </div>
                  )}
                  {venue && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {venue.name}, {venue.city}
                        {venue.state && `, ${venue.state}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  {songCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Music2 className="h-3 w-3" />
                      <span>{songCount} songs</span>
                    </div>
                  )}
                  {voteCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Vote className="h-3 w-3" />
                      <span>{voteCount} votes</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/setlists/${show?.id || setlist.showId}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Setlist
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {setlists.length >= 5 && (
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link href={`/setlists?artist=${artistName}`}>
                View All Setlists
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
