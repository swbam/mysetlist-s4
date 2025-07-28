"use client"

import { Button } from "@repo/design-system/components/ui/button"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

// Loading component for the modal
function ModalSkeleton() {
  return (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </Button>
  )
}

// Lazy load the add song modal
export const LazyAddSongModal = dynamic<any>(
  () =>
    import("./add-song-modal").then((mod) => ({ default: mod.AddSongModal })),
  {
    loading: () => <ModalSkeleton />,
    ssr: false, // Modals don't need SSR
  }
)

// The lazy-loaded component already provides performance benefits
