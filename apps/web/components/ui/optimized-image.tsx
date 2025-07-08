'use client';

import { cn } from '@repo/design-system/lib/utils';
import { ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  fallback?: React.ReactNode;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: string;
  rounded?: boolean;
  overlay?: React.ReactNode;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  fallback,
  placeholder = 'empty',
  blurDataURL,
  priority = false,
  sizes,
  quality = 80,
  loading = 'lazy',
  onLoad,
  onError,
  aspectRatio,
  rounded = false,
  overlay,
  objectFit = 'cover',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, loading]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const defaultFallback = (
    <div className="flex h-full flex-col items-center justify-center bg-muted text-muted-foreground">
      <ImageIcon className="mb-2 h-8 w-8" />
      <span className="text-sm">Image unavailable</span>
    </div>
  );

  const loadingPlaceholder = (
    <div className="flex h-full items-center justify-center bg-muted/50">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  // Generate responsive sizes if not provided
  const responsiveSizes =
    sizes ||
    (fill
      ? '100vw'
      : `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`);

  // Generate blur data URL for placeholder
  const defaultBlurDataURL =
    blurDataURL ||
    (placeholder === 'blur'
      ? 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=='
      : undefined);

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatio && `aspect-[${aspectRatio}]`,
        rounded && 'rounded-lg',
        className
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
      {...props}
    >
      {/* Show loading state or error fallback */}
      {!isInView || isLoading || hasError ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {hasError ? fallback || defaultFallback : loadingPlaceholder}
        </div>
      ) : null}

      {/* Actual image */}
      {isInView && !hasError && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'none' && 'object-none',
            objectFit === 'scale-down' && 'object-scale-down'
          )}
          placeholder={placeholder}
          blurDataURL={defaultBlurDataURL}
          priority={priority}
          sizes={responsiveSizes}
          quality={quality}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Overlay content */}
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          {overlay}
        </div>
      )}
    </div>
  );
}

// Avatar component optimized for mobile
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
  className?: string;
  indicator?: 'online' | 'offline' | 'away' | 'busy';
}

export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  fallbackText,
  className,
  indicator,
}: OptimizedAvatarProps) {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const indicatorSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
  };

  const indicatorColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const initials =
    fallbackText ||
    alt
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className={cn('relative flex-shrink-0', sizeClasses[size], className)}>
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          fill
          className="rounded-full"
          objectFit="cover"
          priority={size === 'lg' || size === 'xl'}
          sizes="(max-width: 640px) 64px, 128px"
          fallback={
            <div className="flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
              {initials}
            </div>
          }
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
          {initials}
        </div>
      )}

      {/* Status indicator */}
      {indicator && (
        <div
          className={cn(
            'absolute right-0 bottom-0 rounded-full border-2 border-background',
            indicatorSizes[size],
            indicatorColors[indicator]
          )}
          aria-label={`Status: ${indicator}`}
        />
      )}
    </div>
  );
}

// Gallery component for multiple images
interface ImageGalleryProps {
  images: Array<{
    id: string;
    src: string;
    alt: string;
    caption?: string;
  }>;
  className?: string;
  aspectRatio?: string;
  onImageClick?: (index: number) => void;
}

export function ImageGallery({
  images,
  className,
  aspectRatio = '16/9',
  onImageClick,
}: ImageGalleryProps) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className={className}>
        <OptimizedImage
          src={images[0].src}
          alt={images[0].alt}
          fill
          aspectRatio={aspectRatio}
          className="cursor-pointer"
          onClick={() => onImageClick?.(0)}
          rounded
        />
        {images[0].caption && (
          <p className="mt-2 text-muted-foreground text-sm">
            {images[0].caption}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-2', className)}>
      {images.length === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <OptimizedImage
              key={image.id}
              src={image.src}
              alt={image.alt}
              fill
              aspectRatio={aspectRatio}
              className="cursor-pointer"
              onClick={() => onImageClick?.(index)}
              rounded
            />
          ))}
        </div>
      )}

      {images.length === 3 && (
        <div className="grid grid-cols-2 gap-2">
          <OptimizedImage
            src={images[0].src}
            alt={images[0].alt}
            fill
            aspectRatio={aspectRatio}
            className="cursor-pointer"
            onClick={() => onImageClick?.(0)}
            rounded
          />
          <div className="grid gap-2">
            {images.slice(1).map((image, index) => (
              <OptimizedImage
                key={image.id}
                src={image.src}
                alt={image.alt}
                fill
                aspectRatio="2/1"
                className="cursor-pointer"
                onClick={() => onImageClick?.(index + 1)}
                rounded
              />
            ))}
          </div>
        </div>
      )}

      {images.length >= 4 && (
        <div className="grid grid-cols-2 gap-2">
          {images.slice(0, 3).map((image, index) => (
            <OptimizedImage
              key={image.id}
              src={image.src}
              alt={image.alt}
              fill
              aspectRatio={index === 0 ? aspectRatio : '1/1'}
              className={cn('cursor-pointer', index === 0 && 'col-span-2')}
              onClick={() => onImageClick?.(index)}
              rounded
            />
          ))}

          {images.length > 4 ? (
            <div className="relative">
              <OptimizedImage
                src={images[3].src}
                alt={images[3].alt}
                fill
                aspectRatio="1/1"
                className="cursor-pointer"
                onClick={() => onImageClick?.(3)}
                rounded
              />
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg bg-black/60"
                onClick={() => onImageClick?.(3)}
              >
                <span className="font-medium text-white">
                  +{images.length - 3} more
                </span>
              </div>
            </div>
          ) : (
            <OptimizedImage
              src={images[3].src}
              alt={images[3].alt}
              fill
              aspectRatio="1/1"
              className="cursor-pointer"
              onClick={() => onImageClick?.(3)}
              rounded
            />
          )}
        </div>
      )}
    </div>
  );
}
