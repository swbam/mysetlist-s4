'use client';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@repo/design-system/components/ui/button';
import { motion } from 'framer-motion';
import { ChevronRight, Music, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useMemo } from 'react';

const HomeHero = React.memo(function HomeHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-40">
      {/* Animated gradient background with subtle mesh pattern */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="-z-10 absolute inset-0"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(120,0,255,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_70%)]" />
      </motion.div>

      <div className="container mx-auto px-4">
        {/* Hero content */}
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium text-sm">
                Trending Now: 1,247 Active Shows
              </span>
            </div>

            {/* Main heading */}
            <h1 className="bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text font-extrabold text-6xl text-transparent leading-[0.95] tracking-tight md:text-8xl">
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
          </motion.div>

          {/* Enhanced search section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-12 space-y-4"
          >
            {/* Search container with glow effect */}
            <div className="relative mx-auto max-w-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 via-gray-600/20 to-gray-800/20 opacity-50 blur-3xl" />
              <div className="relative">
                <SearchBar
                  variant="hero"
                  placeholder="Search artists..."
                  className="shadow-2xl"
                />
              </div>
            </div>

            {/* Quick search suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {['Taylor Swift', 'The Weeknd', 'Drake', 'Olivia Rodrigo'].map(
                (artist) => (
                  <Link
                    key={artist}
                    href={`/artists/${artist.toLowerCase().replace(' ', '-')}`}
                    className="rounded-full bg-muted/50 px-3 py-1 transition-colors hover:bg-muted"
                  >
                    {artist}
                  </Link>
                )
              )}
            </div>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button size="lg" className="group min-w-[200px]" asChild>
              <Link href="/artists">
                Start Voting
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-w-[200px]"
              asChild
            >
              <Link href="/discover">
                <Music className="mr-2 h-4 w-4" />
                Discover Music
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 md:grid-cols-3"
          >
            <div className="text-center">
              <div className="font-bold text-3xl text-white md:text-4xl">
                10K+
              </div>
              <div className="mt-1 text-muted-foreground text-sm">
                Active Artists
              </div>
            </div>
            <div className="text-center">
              <div className="font-bold text-3xl text-white md:text-4xl">
                50M+
              </div>
              <div className="mt-1 text-muted-foreground text-sm">
                Votes Cast
              </div>
            </div>
            <div className="col-span-2 text-center md:col-span-1">
              <div className="font-bold text-3xl text-white md:text-4xl">
                100K+
              </div>
              <div className="mt-1 text-muted-foreground text-sm">
                Music Fans
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

export default HomeHero;
