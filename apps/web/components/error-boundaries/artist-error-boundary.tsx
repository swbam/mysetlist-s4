"use client"

import type { ReactNode } from "react"
import { PageErrorBoundary } from "./page-error-boundary"

interface ArtistErrorBoundaryProps {
  children: ReactNode
  artistName?: string
}

export function ArtistErrorBoundary({
  children,
  artistName,
}: ArtistErrorBoundaryProps) {
  const ErrorBoundary = PageErrorBoundary as any

  return (
    <ErrorBoundary
      fallbackTitle={
        artistName ? `Error loading ${artistName}` : "Error loading artist"
      }
      fallbackDescription="We couldn't load this artist's information. This might be because the artist data is still syncing or there was a temporary issue."
      showBackButton={true}
    >
      {children}
    </ErrorBoundary>
  )
}
