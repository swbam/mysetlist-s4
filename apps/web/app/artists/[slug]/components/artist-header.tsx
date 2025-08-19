"use client";

import Image from "next/image";
import type React from "react";

type ArtistHeaderProps = {
  artist: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    smallImageUrl?: string;
    genres?: string;
    popularity?: number;
    followers?: number;
    verified?: boolean;
    externalUrls?: string;
    spotifyId?: string;
  };
};

export const ArtistHeader: React.FC<ArtistHeaderProps> = ({ artist }) => {
  const genres = safeParseJsonArray(artist.genres);

  return (
    <div className="flex items-center gap-6" data-testid="artist-header">
      <div className="relative h-24 w-24 overflow-hidden rounded-md bg-muted">
        <Image
          src={artist.imageUrl ?? "/img/artist-placeholder.svg"}
          alt={artist.name}
          fill
          className="object-cover"
          sizes="96px"
          priority
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.src = "/img/artist-placeholder.svg";
          }}
        />
      </div>

      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold">{artist.name}</h1>
        {genres.length > 0 && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {genres.join(" · ")}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {artist.popularity ? (
            <span>Popularity: {artist.popularity}</span>
          ) : null}
          {artist.followers ? (
            <span>Followers: {artist.followers.toLocaleString()}</span>
          ) : null}
          {artist.verified ? <span>Verified</span> : null}
        </div>
      </div>
    </div>
  );
};

function safeParseJsonArray(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export default ArtistHeader;
