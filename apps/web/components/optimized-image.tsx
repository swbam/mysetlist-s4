'use client';

import { cn } from '@repo/design-system/lib/utils';
import { AlertCircle, ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallbackSrc?: string;
  lazy?: boolean;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  aspectRatio = 'square',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  fallbackSrc,
  lazy = true,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 80,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(!lazy || priority);

  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority, isInView]);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(
    (error: any) => {
      setIsLoading(false);
      setHasError(true);

      // Try fallback source if available
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setHasError(false);
        setIsLoading(true);
        return;
      }

      onError?.(error);
    },
    [fallbackSrc, currentSrc, onError]
  );

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'video':
        return 'aspect-video';
      case 'portrait':
        return 'aspect-[3/4]';
      case 'landscape':
        return 'aspect-[4/3]';
      default:
        return aspectRatio.startsWith('aspect-')
          ? aspectRatio
          : `aspect-[${aspectRatio}]`;
    }
  };

  // Generate blur data URL if not provided
  const getBlurDataURL = () => {
    if (blurDataURL) {
      return blurDataURL;
    }

    // Simple 1x1 pixel blur for placeholder
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';
  };

  // Container classes
  const containerClasses = cn(
    'relative overflow-hidden bg-muted',
    !width && !height && getAspectRatioClass(),
    className
  );

  // Don't render image until in view (for lazy loading)
  if (!isInView) {
    return (
      <div ref={imgRef} className={containerClasses}>
        {/* Loading placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            {lazy && <div className="text-center text-xs">Loading...</div>}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className={containerClasses}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <div className="text-center text-xs">Failed to load image</div>
          </div>
        </div>
      </div>
    );
  }

  const imageProps: any = {
    src: currentSrc,
    alt,
    fill: !width && !height,
    sizes,
    priority,
    quality,
    placeholder: placeholder as any,
    blurDataURL: placeholder === 'blur' ? getBlurDataURL() : undefined,
    onLoad: handleLoad,
    onError: handleError,
    className: cn(
      'object-cover transition-all duration-300',
      isLoading && 'scale-110 opacity-0 blur-sm',
      !isLoading && 'scale-100 opacity-100 blur-0'
    ),
  };

  if (width) {
    imageProps.width = width;
  }
  if (height) {
    imageProps.height = height;
  }

  return (
    <div ref={imgRef} className={containerClasses}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Optimized Next.js Image */}
      <Image {...imageProps} />

      {/* Progressive enhancement overlay */}
      {isLoading && placeholder === 'blur' && (
        <div
          className="absolute inset-0 bg-center bg-cover opacity-50 blur-sm filter"
          style={{
            backgroundImage: `url(${getBlurDataURL()})`,
          }}
        />
      )}
    </div>
  );
}

// Convenience wrapper for common image types
export function ArtistImage(props: Omit<OptimizedImageProps, 'aspectRatio'>) {
  return (
    <OptimizedImage
      {...props}
      aspectRatio="square"
      sizes="(max-width: 768px) 100px, (max-width: 1200px) 150px, 200px"
    />
  );
}

export function VenueImage(props: Omit<OptimizedImageProps, 'aspectRatio'>) {
  return (
    <OptimizedImage
      {...props}
      aspectRatio="landscape"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
    />
  );
}

export function ShowImage(props: Omit<OptimizedImageProps, 'aspectRatio'>) {
  return (
    <OptimizedImage
      {...props}
      aspectRatio="video"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
    />
  );
}
