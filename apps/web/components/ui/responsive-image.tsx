"use client";

import { Skeleton } from "@repo/design-system";
import { cn } from "@repo/design-system";
import Image from "next/image";
import React, { useState } from "react";

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  className?: string;
  fallbackSrc?: string;
  showSkeleton?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "wide" | string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/9]",
};

export const ResponsiveImage = React.memo(function ResponsiveImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
  quality = 75,
  className,
  fallbackSrc,
  showSkeleton = true,
  aspectRatio,
  objectFit = "cover",
}: ResponsiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);

    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
      setHasError(false);
    }
  };

  const getAspectRatioClass = () => {
    if (!aspectRatio) return "";
    return (
      aspectRatioClasses[aspectRatio as keyof typeof aspectRatioClasses] ||
      aspectRatio
    );
  };

  const imageProps = {
    src: currentSrc,
    alt,
    sizes,
    priority,
    quality,
    onLoad: handleLoad,
    onError: handleError,
    className: cn(
      "transition-opacity duration-300",
      isLoading && "opacity-0",
      !isLoading && "opacity-100",
      `object-${objectFit}`,
      className,
    ),
  };

  const containerClass = cn(
    "relative overflow-hidden",
    getAspectRatioClass(),
    fill && "h-full w-full",
  );

  if (hasError && !fallbackSrc) {
    return (
      <div className={containerClass}>
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center">
            <div className="mb-2 text-2xl">📷</div>
            <div className="text-sm">Image not available</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Loading skeleton */}
      {isLoading && showSkeleton && (
        <Skeleton className="absolute inset-0 h-full w-full" />
      )}

      {/* Image */}
      {fill ? (
        <Image {...imageProps} fill />
      ) : (
        <Image {...imageProps} width={width} height={height} />
      )}
    </div>
  );
});

export default ResponsiveImage;
