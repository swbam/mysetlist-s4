"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@repo/design-system/components/ui/carousel";
import { cn } from "@repo/design-system/lib/utils";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface EnhancedContentSliderProps {
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  viewAllText?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
  children: React.ReactNode;
  itemsPerView?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
  loop?: boolean;
  showDots?: boolean;
  gradientOverlay?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function EnhancedContentSlider({
  title,
  subtitle,
  viewAllLink,
  viewAllText = "View All",
  autoPlay = false,
  autoPlayInterval = 4000,
  className,
  children,
  itemsPerView: _itemsPerView = {
    mobile: 1.2,
    tablet: 2.5,
    desktop: 4,
    wide: 6,
  },
  loop = true,
  showDots = false,
  gradientOverlay = true,
  isLoading = false,
  error = null,
}: EnhancedContentSliderProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-play functionality with performance optimization
  const startAutoPlay = useCallback(() => {
    if (!api || !autoPlay || isHovered) {
      return;
    }

    intervalRef.current = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else if (loop) {
        api.scrollTo(0);
      }
    }, autoPlayInterval);
  }, [api, autoPlay, autoPlayInterval, loop, isHovered]);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoPlay && !isHovered) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }

    return () => {
      stopAutoPlay();
    };
  }, [autoPlay, isHovered, startAutoPlay, stopAutoPlay]);

  // Handle mouse events for auto-play
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  if (error) {
    return (
      <section className={cn("relative py-16 md:py-24", className)}>
        <div className="container relative mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              {title}
            </h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("relative py-16 md:py-24", className)}>
      {/* Background gradient effect */}
      {gradientOverlay && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      )}

      <div className="container relative mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <h2 className="mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {viewAllLink && !isLoading && (
            <motion.div
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link
                href={viewAllLink}
                className="group flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md p-1"
                prefetch
              >
                {viewAllText}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Carousel
            setApi={setApi}
            opts={{
              loop,
              align: "start",
              skipSnaps: false,
              dragFree: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
              {children}
            </CarouselContent>

            {/* Custom navigation buttons - Hidden on mobile */}
            <div className="-left-2 md:-left-4 lg:-left-6 -translate-y-1/2 absolute top-1/2 hidden sm:block">
              <CarouselPrevious className="h-10 w-10 border-border/50 bg-background/80 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary sm:h-12 sm:w-12" />
            </div>
            <div className="-right-2 md:-right-4 lg:-right-6 -translate-y-1/2 absolute top-1/2 hidden sm:block">
              <CarouselNext className="h-10 w-10 border-border/50 bg-background/80 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary sm:h-12 sm:w-12" />
            </div>
          </Carousel>

          {/* Dots indicator */}
          {showDots && count > 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 flex items-center justify-center gap-2"
            >
              {Array.from({ length: count }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    index === current
                      ? "w-8 bg-primary"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// Export a wrapper for carousel items with consistent styling
export function EnhancedContentSliderItem({
  children,
  className,
  basis,
}: {
  children: React.ReactNode;
  className?: string;
  basis?: string;
}) {
  return (
    <CarouselItem
      className={cn(
        "pl-1 sm:pl-2 md:pl-4",
        basis ||
          "basis-4/5 sm:basis-2/5 md:basis-1/3 lg:basis-1/4 xl:basis-1/6",
        className,
      )}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="h-full rounded-lg"
      >
        {children}
      </motion.div>
    </CarouselItem>
  );
}
