import { Button } from "@repo/design-system/components/ui/button";
import { ChevronRight, Music } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LiteSearch } from "./components/lite-search";
import { RealActiveShows } from "./components/real-active-shows";
import { RealPopularArtists } from "./components/real-popular-artists";
import { RealStats } from "./components/real-stats";
import TrendingSection from "./components/trending-simple";

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
            <RealActiveShows />

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
              <LiteSearch
                placeholder="Search artists via Ticketmaster..."
                className="w-full"
              />
            </div>

            {/* Quick search suggestions */}
            <RealPopularArtists />
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
          <RealStats />
        </div>
      </div>
    </section>
  );
}

// Static import for faster loading - we can optimize this later if needed

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

      {/* Trending sections */}
      <TrendingSection />
    </div>
  );
}
