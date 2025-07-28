"use client"

import { Card } from "@repo/design-system/components/ui/card"
import { AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { SyncProgressDisplay } from "~/components/artist/sync-progress"
import { useAutoImportOnMount } from "~/hooks/use-artist-auto-import"
import { useArtistSync } from "~/hooks/use-artist-sync"

interface ArtistPageWrapperProps {
  artistId: string
  artistName: string
  spotifyId?: string | null
  children: React.ReactNode
}

export function ArtistPageWrapper({
  artistId,
  artistName,
  spotifyId,
  children,
}: ArtistPageWrapperProps) {
  const [showSyncProgress, setShowSyncProgress] = useState(false)
  const { loading, error } = useAutoImportOnMount({
    artistId,
    artistName,
    ...(spotifyId && { spotifyId }),
    enabled: true,
  })

  const { progress: syncProgress } = useArtistSync()

  useEffect(() => {
    if (error) {
    }
  }, [error])

  useEffect(() => {
    // Show sync progress if there's an active sync for this artist
    if (syncProgress && syncProgress.artistId === artistId) {
      setShowSyncProgress(true)
    }
  }, [syncProgress, artistId])

  // Show loading state briefly
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="mb-8 h-64 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-4">
            <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    )
  }

  // Don't show sync errors to users - just work with cached data
  // Only show error if it's a critical page loading error (not sync errors)
  if (error && error.includes("not found") && !showSyncProgress) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="space-y-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Artist not found
              </h3>
              <p className="text-red-700 text-sm dark:text-red-300">
                This artist could not be found in our database.
              </p>
            </div>
          </div>
        </Card>
        {children}
      </div>
    )
  }

  return (
    <>
      {showSyncProgress &&
        syncProgress &&
        syncProgress.artistId === artistId && (
          <div className="container mx-auto pt-8">
            <SyncProgressDisplay
              artistId={artistId}
              onComplete={() => setShowSyncProgress(false)}
            />
          </div>
        )}
      {children}
    </>
  )
}
