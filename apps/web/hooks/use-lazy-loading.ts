'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useLazyLoading<T extends Element = HTMLElement>(
  options: UseLazyLoadingOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
  } = options;

  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((element: T | null) => {
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }

    elementRef.current = element;

    if (element && !hasTriggered) {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    }
  }, [hasTriggered]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            setHasTriggered(true);
            if (elementRef.current && observerRef.current) {
              observerRef.current.unobserve(elementRef.current);
            }
          }
        } else {
          if (!triggerOnce) {
            setIsInView(false);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { isInView, setRef };
}

// Specialized hook for image lazy loading
export function useLazyImage(src: string, options: UseLazyLoadingOptions = {}) {
  const { isInView, setRef } = useLazyLoading<HTMLImageElement>(options);
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isInView && src && !imageSrc) {
      setImageSrc(src);
    }
  }, [isInView, src, imageSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  return {
    imageSrc,
    isLoaded,
    error,
    setRef,
    handleLoad,
    handleError,
  };
}

// Hook for lazy loading component chunks
export function useLazyComponent<T = any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: UseLazyLoadingOptions = {}
) {
  const { isInView, setRef } = useLazyLoading(options);
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isInView && !Component && !isLoading) {
      setIsLoading(true);
      importFn()
        .then((module) => {
          setComponent(() => module.default);
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error('Failed to load component'));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isInView, Component, isLoading, importFn]);

  return {
    Component,
    isLoading,
    error,
    setRef,
  };
}

// Preload images for better UX
export function useImagePreloader(imageUrls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback((src: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        resolve();
      };
      img.onerror = () => {
        setFailedImages(prev => new Set(prev).add(src));
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(async (urls: string[]) => {
    const promises = urls.map(url => 
      preloadImage(url).catch(() => {}) // Continue with other images if one fails
    );
    await Promise.allSettled(promises);
  }, [preloadImage]);

  useEffect(() => {
    if (imageUrls.length > 0) {
      preloadImages(imageUrls);
    }
  }, [imageUrls, preloadImages]);

  return {
    loadedImages,
    failedImages,
    preloadImage,
    preloadImages,
  };
}