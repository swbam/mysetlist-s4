import { Calendar, Music, Vote, Zap } from "lucide-react"
import React from "react"

function Features() {
  return (
    <div className="w-full py-16 md:py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-8 md:gap-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col gap-2">
              <h2 className="mx-auto max-w-3xl font-bold text-3xl tracking-tight md:text-4xl lg:text-5xl">
                Everything you need for live music
              </h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed md:text-lg">
                Discover concerts, track setlists, vote on songs, and connect
                with music fans worldwide
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="flex aspect-square h-full flex-col justify-between rounded-lg bg-muted p-4 transition-colors hover:bg-muted/80 sm:p-6 lg:col-span-2 lg:aspect-auto">
              <Music className="h-6 w-6 stroke-1 text-primary sm:h-8 sm:w-8" />
              <div className="flex flex-col">
                <h3 className="text-lg tracking-tight sm:text-xl">
                  Artist Discovery
                </h3>
                <p className="mt-2 text-sm text-muted-foreground sm:max-w-xs sm:text-base">
                  Find your favorite artists and discover new ones through our
                  Spotify integration
                </p>
              </div>
            </div>
            <div className="flex aspect-square flex-col justify-between rounded-lg bg-muted p-4 transition-colors hover:bg-muted/80 sm:p-6">
              <Calendar className="h-6 w-6 stroke-1 text-primary sm:h-8 sm:w-8" />
              <div className="flex flex-col">
                <h3 className="text-lg tracking-tight sm:text-xl">
                  Show Tracking
                </h3>
                <p className="mt-2 text-sm text-muted-foreground sm:max-w-xs sm:text-base">
                  Never miss a concert with our comprehensive show tracking and
                  notifications
                </p>
              </div>
            </div>

            <div className="flex aspect-square flex-col justify-between rounded-lg bg-muted p-4 transition-colors hover:bg-muted/80 sm:p-6">
              <Vote className="h-6 w-6 stroke-1 text-primary sm:h-8 sm:w-8" />
              <div className="flex flex-col">
                <h3 className="text-lg tracking-tight sm:text-xl">
                  Setlist Voting
                </h3>
                <p className="mt-2 text-sm text-muted-foreground sm:max-w-xs sm:text-base">
                  Vote on which songs you want to hear at upcoming shows
                </p>
              </div>
            </div>
            <div className="flex aspect-square h-full flex-col justify-between rounded-lg bg-muted p-4 transition-colors hover:bg-muted/80 sm:p-6 lg:col-span-2 lg:aspect-auto">
              <Zap className="h-6 w-6 stroke-1 text-primary sm:h-8 sm:w-8" />
              <div className="flex flex-col">
                <h3 className="text-lg tracking-tight sm:text-xl">
                  Real-time Updates
                </h3>
                <p className="mt-2 text-sm text-muted-foreground sm:max-w-xs sm:text-base">
                  Get instant updates on setlists, votes, and show changes as
                  they happen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Features
