"use client";
import { Button } from "@repo/design-system";
import { motion } from "framer-motion";
import { ChevronRight, Music, TrendingUp } from "lucide-react";
import Link from "next/link";
import React from "react";
import { SearchBar } from "~/components/search-bar";

function HomeHero() {
  return (
    <section
      className="relative overflow-hidden pt-32 pb-40"
      aria-label="Homepage hero section"
      role="banner"
    >
      {/* Gradient background with subtle mesh pattern */}
      <div className="-z-10 absolute inset-0 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(120,0,255,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_70%)]" />
      </div>

      <div className="container mx-auto px-4">
        {/* Hero content */}
        <div className="mx-auto max-w-5xl text-center">
          <div className="space-y-6 animate-slide-up">
            {/* Badge */}
            <output
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary"
              aria-label="Live statistics"
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-sm">
                Trending Now: 1,247 Active Shows
              </span>
            </output>

            {/* Main heading */}
            <h1
              className="bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text font-extrabold text-6xl text-transparent leading-[0.95] tracking-tight md:text-8xl"
              id="main-heading"
            >
              Crowd-Curated
              <br />
              <span className="bg-gradient-to-r from-gray-100 via-gray-400 to-gray-500 bg-clip-text">
                Setlists
              </span>
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
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 via-gray-600/20 to-gray-800/20 opacity-50 blur-3xl" />
              <div className="relative">
                <SearchBar
                  variant="hero"
                  placeholder="Search artists..."
                  className="w-full shadow-2xl"
                />
              </div>
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
                    className="rounded-full bg-muted/50 px-3 py-1.5 text-xs transition-all duration-200 hover:bg-muted hover:scale-105 sm:text-sm"
                  >
                    {artist}
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4 sm:px-0"
          >
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
          </motion.div>

          {/* Stats */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 px-4 sm:px-0 md:grid-cols-3 md:gap-8"
            aria-label="Platform statistics"
          >
            <div className="text-center">
              <div
                className="font-bold text-2xl text-white sm:text-3xl md:text-4xl"
                aria-label="Ten thousand plus"
              >
                10K+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Active Artists
              </div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-white sm:text-3xl md:text-4xl">
                50M+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Votes Cast
              </div>
            </div>
            <div className="col-span-2 text-center md:col-span-1">
              <div className="font-bold text-2xl text-white sm:text-3xl md:text-4xl">
                100K+
              </div>
              <div className="mt-1 text-muted-foreground text-xs sm:text-sm">
                Music Fans
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
