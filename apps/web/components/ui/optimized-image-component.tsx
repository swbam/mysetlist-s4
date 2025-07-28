"use client"

import { cn } from "@repo/design-system/lib/utils"
import Image, { type ImageProps } from "next/image"
import { useState } from "react"

interface OptimizedImageProps extends Omit<ImageProps, "onError" | "onLoad"> {
  fallback?: React.ReactNode
  aspectRatio?: "square" | "video" | "portrait" | "landscape"
  className?: string
  containerClassName?: string
  showPlaceholder?: boolean
  placeholderIcon?: React.ReactNode
}

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
} as const

export function OptimizedImage({
  src,
  alt,
  fallback,
  aspectRatio,
  className,
  containerClassName,
  showPlaceholder = true,
  placeholderIcon,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Handle image load error
  const handleError = () => {
    setImageError(true)
    setIsLoading(false)
  }

  // Handle image load success
  const handleLoad = () => {
    setIsLoading(false)
  }

  // If there's an error and no src, show fallback
  if (!src || imageError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20",
          aspectRatio && aspectRatioClasses[aspectRatio],
          "overflow-hidden",
          containerClassName
        )}
        role="img"
        aria-label={alt}
      >
        {fallback || (
          <>
            {placeholderIcon && (
              <div className="text-muted-foreground/30">{placeholderIcon}</div>
            )}
            {!placeholderIcon && showPlaceholder && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                <div className="text-6xl font-bold">
                  {alt.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-center max-w-20 leading-tight">
                  {alt}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        aspectRatio && aspectRatioClasses[aspectRatio],
        containerClassName
      )}
    >
      {/* Loading placeholder */}
      {isLoading && showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className="text-muted-foreground/30">
            {placeholderIcon || (
              <div className="text-2xl font-bold">
                {alt.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Optimized Image */}
      <Image
        src={src}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        className={cn(
          "object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />
    </div>
  )
}

// Preset components for common use cases
export function ArtistImage({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, "aspectRatio">) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="square"
      className={className}
      placeholderIcon={<div className="text-4xl">🎤</div>}
      {...props}
    />
  )
}

export function VenueImage({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, "aspectRatio">) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="landscape"
      className={className}
      placeholderIcon={<div className="text-4xl">🏟️</div>}
      {...props}
    />
  )
}
