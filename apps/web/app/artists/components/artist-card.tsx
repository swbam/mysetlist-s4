"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Card, CardContent } from "@repo/design-system/components/ui/card"
import { CheckCircle2, Music, TrendingUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatNumber, parseGenres } from "~/lib/utils"

interface ArtistCardProps {
  artist: {
    id: string
    name: string
    slug: string
    imageUrl: string | null
    smallImageUrl: string | null
    genres: string | null
    followers: number | null
    followerCount: number | null
    popularity: number | null
    verified: boolean
    trendingScore: number | null
  }
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const genres = parseGenres(artist.genres)
  const imageUrl = artist.smallImageUrl || artist.imageUrl

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/artists/${artist.slug}`}>
        <div className="relative aspect-square cursor-pointer overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={artist.name}
              fill
              className="object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Music className="h-16 w-16 text-primary/30" />
            </div>
          )}
          {artist.trendingScore && artist.trendingScore > 85 && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Hot
              </Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/artists/${artist.slug}`}>
          <div className="mb-1 flex items-center gap-1">
            <h3 className="truncate font-semibold text-lg transition-colors hover:text-primary">
              {artist.name}
            </h3>
            {artist.verified && (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
            )}
          </div>
        </Link>

        {genres.length > 0 && (
          <Badge variant="outline" className="mb-3">
            {genres[0]}
          </Badge>
        )}

        <div className="flex items-center justify-between text-muted-foreground text-sm">
          {artist.followers ? (
            <span>{formatNumber(artist.followers)} followers</span>
          ) : (
            <span>{formatNumber(artist.followerCount || 0)} followers</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
