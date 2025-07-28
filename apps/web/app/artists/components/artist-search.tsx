"use client"

import { UnifiedSearch } from "~/components/unified-search"

export function ArtistSearch() {
  return (
    <UnifiedSearch
      variant="artists-only"
      placeholder="Search for artists..."
      limit={10}
    />
  )
}
