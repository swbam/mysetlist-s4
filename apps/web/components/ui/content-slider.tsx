'use client';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@repo/design-system/components/ui/carousel';
import { cn } from '@repo/design-system/lib/utils';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ContentSliderProps {
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
}

export function ContentSlider({
  title,
  subtitle,
  viewAllLink,
  viewAllText = 'View All',
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
}: ContentSliderProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-play functionality with performance optimization
  const startAutoPlay = useCallback(() => {
    if (!api || !autoPlay) {
      return;
    }

    intervalRef.current = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else if (loop) {
        api.scrollTo(0);
      }
    }, autoPlayInterval);
  }, [api, autoPlay, autoPlayInterval, loop]);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (!api || !autoPlay) {
      return;
    }

    // Start auto-play
    startAutoPlay();

    // Pause on hover
    const container = api.containerNode();
    container.addEventListener('mouseenter', stopAutoPlay);
    container.addEventListener('mouseleave', startAutoPlay);

    return () => {
      stopAutoPlay();
      container.removeEventListener('mouseenter', stopAutoPlay);
      container.removeEventListener('mouseleave', startAutoPlay);
    };
  }, [api, autoPlay, startAutoPlay, stopAutoPlay]);


  return (
    <section className={cn('relative py-16 md:py-24', className)}>
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
          {viewAllLink && (
            <motion.a
              href={viewAllLink}
              className="group flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
              whileHover={{ x: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {viewAllText}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </motion.a>
          )}
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <Carousel
            setApi={setApi}
            opts={{ loop, align: 'start' }}
            className="w-full"
          >
            <CarouselContent className="-ml-1 sm:-ml-2 md:-ml-4">
              {children}
            </CarouselContent>

            {/* Custom navigation buttons - Hidden on mobile */}
            <div className="-left-2 md:-left-4 lg:-left-6 -translate-y-1/2 absolute top-1/2 hidden sm:block">
              <CarouselPrevious className="h-10 w-10 border-border/50 bg-background/80 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:shadow-xl sm:h-12 sm:w-12" />
            </div>
            <div className="-right-2 md:-right-4 lg:-right-6 -translate-y-1/2 absolute top-1/2 hidden sm:block">
              <CarouselNext className="h-10 w-10 border-border/50 bg-background/80 shadow-lg backdrop-blur-sm transition-all hover:bg-background hover:shadow-xl sm:h-12 sm:w-12" />
            </div>
          </Carousel>

          {/* Dots indicator */}
          {showDots && count > 0 && (
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
                    'h-2 w-2 rounded-full transition-all duration-300',
                    index === current
                      ? 'w-8 bg-primary'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
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
export function ContentSliderItem({
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
        'pl-1 sm:pl-2 md:pl-4',
        basis || 'basis-4/5 sm:basis-2/5 md:basis-1/3 lg:basis-1/4 xl:basis-1/6',
        className
      )}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="h-full"
      >
        {children}
      </motion.div>
    </CarouselItem>
  );
}
