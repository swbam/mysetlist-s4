import { Button } from "@repo/design-system/components/ui/button";
import { ChevronRight, Music, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "~/components/search-bar";

// Ultra-light homepage component for initial render
function LightHero() {
  return (
    <section
      className="relative overflow-hidden pt-32 pb-40 bg-background"
      aria-label="Homepage hero section"
      role="banner"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center">
          <div className="space-y-6">
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

          {/* Search section */}
          <div className="mt-12 space-y-4 px-4 sm:px-0">
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
          <div className="mt-10 flex flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4 sm:px-0">
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
            className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 px-4 sm:px-0 md:grid-cols-3 md:gap-8"
            role="region"
            aria-label="Platform statistics"
          >
            <div className="text-center">
              <div className="font-bold text-2xl sm:text-3xl md:text-4xl">
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

// Dynamic import for trending sections to load after initial render
const TrendingSection = dynamic(
  () => import("./components/trending-section-lazy"),
  {
    loading: () => (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </section>
    ),
    ssr: false,
  },
);

export const metadata = {
  title: "TheSet - Concert Setlist Voting Platform",
  description:
    "Vote on concert setlists, discover new artists, and connect with music fans worldwide.",
};

export default function LiteHomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section - Critical render path */}
      <LightHero />

      {/* Trending sections - Load after initial render */}
      <Suspense
        fallback={
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="h-96 animate-pulse rounded-lg bg-muted" />
            </div>
          </section>
        }
      >
        <TrendingSection />
      </Suspense>
    </div>
  );
}
