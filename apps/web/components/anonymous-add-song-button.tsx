"use client"

import { Button } from "@repo/design-system/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip"
import { Lock, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { anonymousUser } from "~/lib/anonymous-user"

interface AnonymousAddSongButtonProps {
  setlistId: string
  isAuthenticated: boolean
  onClick: () => void
  disabled?: boolean
}

export function AnonymousAddSongButton({
  setlistId,
  isAuthenticated,
  onClick,
  disabled = false,
}: AnonymousAddSongButtonProps) {
  const router = useRouter()
  const [canAddSong, setCanAddSong] = useState(true)
  const [hasAddedToThisSetlist, setHasAddedToThisSetlist] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setCanAddSong(anonymousUser.canAddSong())
      setHasAddedToThisSetlist(anonymousUser.hasAddedSongToSetlist(setlistId))
    }
  }, [setlistId, isAuthenticated])

  const handleClick = () => {
    if (!isAuthenticated && (!canAddSong || hasAddedToThisSetlist)) {
      // Show sign up prompt
      return
    }
    onClick()
  }

  const isDisabled =
    disabled || (!isAuthenticated && (!canAddSong || hasAddedToThisSetlist))

  if (!isAuthenticated && !canAddSong) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.push("/auth/sign-up")}
            >
              <Lock className="h-3 w-3" />
              Add Song
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>You've used your free song addition. Sign up to add more!</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (!isAuthenticated && hasAddedToThisSetlist) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.push("/auth/sign-up")}
              disabled
            >
              <Lock className="h-3 w-3" />
              Already Added
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              You've already added a song to this setlist. Sign up to add more!
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={isDisabled}
            className="gap-2"
          >
            <Plus className="h-3 w-3" />
            Add Song
          </Button>
        </TooltipTrigger>
        {!isAuthenticated && (
          <TooltipContent>
            <p>Guest users can add 1 song per setlist</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
