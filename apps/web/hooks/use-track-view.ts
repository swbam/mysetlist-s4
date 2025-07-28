import { useEffect } from "react"

/**
 * Hook to track page views for analytics and trending calculations
 * This calls the track-view API endpoint when a page is viewed
 */
export function useTrackView(
  type: "artist" | "show" | "venue",
  id: string | undefined
) {
  useEffect(() => {
    if (!id) {
      return
    }

    // Track the view after a short delay to ensure page has loaded
    const timeout = setTimeout(async () => {
      try {
        await fetch("/api/analytics/track-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type, id }),
        })
      } catch (_error) {}
    }, 1000)

    return () => clearTimeout(timeout)
  }, [type, id])
}
