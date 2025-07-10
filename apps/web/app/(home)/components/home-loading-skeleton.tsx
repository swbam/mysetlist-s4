'use client';

import { motion } from 'framer-motion';

export function HomeLoadingSkeleton() {
  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-24">
      {/* Hero skeleton */}
      <section className="relative overflow-hidden pt-32 pb-40">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="space-y-6"
            >
              {/* Title skeleton */}
              <div className="mx-auto h-16 w-3/4 rounded-lg bg-gradient-to-r from-muted via-muted/50 to-muted" />
              
              {/* Subtitle skeleton */}
              <div className="mx-auto h-6 w-1/2 rounded-lg bg-muted/70" />
              
              {/* Search skeleton */}
              <div className="mx-auto mt-12 h-14 w-full max-w-2xl rounded-lg bg-muted/60" />
              
              {/* Buttons skeleton */}
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <div className="h-12 w-full min-w-[200px] rounded-lg bg-primary/20 sm:w-auto" />
                <div className="h-12 w-full min-w-[200px] rounded-lg bg-muted/60 sm:w-auto" />
              </div>
              
              {/* Stats skeleton */}
              <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 md:grid-cols-3 md:gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="mx-auto h-8 w-16 rounded bg-muted/70" />
                    <div className="mx-auto mt-2 h-4 w-20 rounded bg-muted/50" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Artists slider skeleton */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2 h-8 w-48 rounded bg-muted/70" />
              <div className="h-5 w-64 rounded bg-muted/50" />
            </div>
            <div className="h-6 w-24 rounded bg-muted/50" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
            {[...Array(7)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                className="space-y-3"
              >
                <div className="aspect-[3/4] rounded-xl bg-muted/60" />
                <div className="h-4 w-3/4 rounded bg-muted/50" />
                <div className="h-3 w-1/2 rounded bg-muted/40" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shows slider skeleton */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2 h-8 w-48 rounded bg-muted/70" />
              <div className="h-5 w-64 rounded bg-muted/50" />
            </div>
            <div className="h-6 w-24 rounded bg-muted/50" />
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
                className="overflow-hidden rounded-lg border border-border/50 bg-card/50"
              >
                <div className="aspect-[16/10] bg-muted/60" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-3/4 rounded bg-muted/60" />
                  <div className="h-4 w-1/2 rounded bg-muted/50" />
                  <div className="h-4 w-full rounded bg-muted/40" />
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 rounded bg-muted/50" />
                    <div className="h-4 w-20 rounded bg-muted/40" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomeLoadingSkeleton;