"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import { syncAnonymousActions } from "~/app/shows/[slug]/anonymous-actions"
import { anonymousUser } from "~/lib/anonymous-user"

export function useAnonymousSync(isAuthenticated: boolean, userId?: string) {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return
    }

    // Check if we have anonymous data to sync
    const sessionData = anonymousUser.getSessionData()

    if (sessionData.votes.length === 0 && sessionData.songsAdded.length === 0) {
      return
    }

    // Sync anonymous actions to the authenticated user
    const performSync = async () => {
      try {
        const results = await syncAnonymousActions(sessionData)

        if (results.votesSynced > 0 || results.songsSynced > 0) {
          toast.success(
            `Synced ${results.votesSynced} votes and ${results.songsSynced} song suggestions to your account!`
          )

          // Clear anonymous session after successful sync
          anonymousUser.clearSession()

          // Refresh the page to show updated data
          router.refresh()
        }

        if (results.errors.length > 0) {
        }
      } catch (_error) {}
    }

    // Delay sync slightly to avoid race conditions
    const timeoutId = setTimeout(performSync, 1000)

    return () => clearTimeout(timeoutId)
  }, [isAuthenticated, userId, router])
}
