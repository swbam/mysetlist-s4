"use client";
import { Button } from "@repo/design-system/components/ui/button";
import { ChevronRight, Music, TrendingUp } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { SearchBar } from "~/components/search-bar";

function HomeHero() {
  return (
    <section
      className="relative overflow-hidden pt-32 pb-40 bg-background"
      aria-label="Homepage hero section"
      role="banner"
    >
      {/* Simple background */}
      <div className="-z-10 absolute inset-0 animate-fade-in">
        <div className="absolute inset-0" />
      </div>

      <div className="container mx-auto px-4">
        {/* Hero content */}
        <div className="mx-auto max-w-5xl text-center">
          <div className="space-y-6 animate-slide-up">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2"
              role="status"
              aria-label="Live statistics"
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-sm">
                Trending Now: 1,247 Active Shows
              </span>
            </div>

            {/* Main heading */}
            <h1
              className="font-extrabold text-6xl leading-[0.95] tracking-tight md:text-8xl"
              id="main-heading"
            >
              Crowd-Curated
              <br />
              <span className="text-muted-foreground">Setlists</span>
            </h1>

            {/* Subheading */}
            <p className="mx-auto max-w-3xl text-muted-foreground text-xl leading-relaxed md:text-2xl">
              Vote on the songs you want to hear at upcoming concerts and see
              what other fans are predicting.
            </p>
          </div>

          {/* Enhanced search section */}
          <div className="mt-12 space-y-4 px-4 sm:px-0 animate-slide-up-delay-1">
            {/* Search container with glow effect */}
            <div className="relative mx-auto w-full max-w-2xl">
              <SearchBar
                variant="artists-only"
                placeholder="Search artists via Ticketmaster..."
                className="w-full"
              />
            </div>

            {/* Quick search suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-sm sm:px-0">
              <span className="text-muted-foreground hidden sm:inline">
                Popular:
              </span>
              <span className="text-muted-foreground text-xs sm:hidden">
                Trending:
              </span>
              {["Taylor Swift", "The Weeknd", "Drake", "Olivia Rodrigo"].map(
                (artist) => (
                  <Link
                    key={artist}
                    href={`/artists/${artist.toLowerCase().replace(" ", "-")}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted sm:text-sm"
                  >
                    {artist}
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4 sm:px-0 animate-slide-up-delay-2">
            <Button
              size="lg"
              className="group w-full min-w-[200px] sm:w-auto"
              asChild
            >
              <Link href="/artists">
                Start Voting
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full min-w-[200px] sm:w-auto"
              asChild
            >
              <Link href="/discover">
                <Music className="mr-2 h-4 w-4" />
                Discover Music
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div
            className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 px-4 sm:px-0 md:grid-cols-3 md:gap-8 animate-fade-in-delay-3"
            role="region"
            aria-label="Platform statistics"
          >
            <div className="text-center">
              <div
                className="font-bold text-2xl sm:text-3xl md:text-4xl"
                aria-label="Ten thousand plus"
              >
                10K+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Active Artists
              </div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
                50M+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Votes Cast
              </div>
            </div>
            <div className="col-span-2 text-center md:col-span-1">
              <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
                100K+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Music Fans
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(HomeHero);
