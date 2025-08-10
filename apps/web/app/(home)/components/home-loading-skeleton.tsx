"use client";

export function HomeLoadingSkeleton() {
  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-24">
      {/* Hero skeleton */}
      <section className="relative overflow-hidden pt-32 pb-40">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl text-center">
            <div className="space-y-6">
              {/* Title skeleton */}
              <div className="mx-auto h-16 w-3/4 rounded-lg bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse" />

              {/* Subtitle skeleton */}
              <div className="mx-auto h-6 w-1/2 rounded-lg bg-muted/70 animate-pulse" />

              {/* Search skeleton */}
              <div className="mx-auto mt-12 h-14 w-full max-w-2xl rounded-lg bg-muted/60 animate-pulse" />

              {/* Buttons skeleton */}
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <div className="h-12 w-full min-w-[200px] rounded-lg bg-primary/20 sm:w-auto animate-pulse" />
                <div className="h-12 w-full min-w-[200px] rounded-lg bg-muted/60 sm:w-auto animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats skeleton */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto h-10 w-24 rounded-lg bg-muted animate-pulse" />
              <div className="mx-auto mt-2 h-4 w-16 rounded bg-muted/60 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
