'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent) => void;
  onError?: (error: Error) => void;
}

export const SafeLink: React.FC<SafeLinkProps> = ({
  href,
  children,
  className,
  prefetch = true,
  replace = false,
  scroll = true,
  shallow = false,
  target,
  rel,
  onClick,
  onError,
  ...props
}) => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      try {
        // Call custom onClick if provided
        if (onClick) {
          onClick(e);
        }

        // Don't prevent default for external links
        if (
          href.startsWith('http') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:')
        ) {
          return;
        }

        // Don't prevent default if target is blank
        if (target === '_blank') {
          return;
        }

        // Don't prevent default if event is already prevented
        if (e.defaultPrevented) {
          return;
        }

        // For internal navigation, use router with error handling
        if (!isNavigating) {
          setIsNavigating(true);

          // Use a timeout to prevent infinite loading states
          const timeoutId = setTimeout(() => {
            setIsNavigating(false);
          }, 5000);

          // Attempt navigation
          const navigationPromise = replace
            ? router.replace(href, { scroll })
            : router.push(href, { scroll });

          navigationPromise
            .then(() => {
              clearTimeout(timeoutId);
              setIsNavigating(false);
            })
            .catch((error) => {
              clearTimeout(timeoutId);
              setIsNavigating(false);

              if (onError) {
                onError(error);
              } else {
                // Fallback to native navigation
                window.location.href = href;
              }
            });

          // Prevent default Link behavior since we're handling it manually
          e.preventDefault();
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }

        // Fallback to native navigation
        if (!href.startsWith('http')) {
          window.location.href = href;
        }
      }
    },
    [href, onClick, onError, isNavigating, router, replace, scroll, target]
  );

  // For external links, use regular Link behavior
  if (
    href.startsWith('http') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return (
      <Link
        href={href}
        className={className}
        target={target}
        rel={rel}
        onClick={onClick}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      prefetch={prefetch}
      target={target}
      rel={rel}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
};

// Hook for safe navigation
export function useSafeNavigation() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = React.useState(false);

  const safeNavigate = React.useCallback(
    async (href: string, options?: { replace?: boolean; scroll?: boolean }) => {
      if (isNavigating) {
        return;
      }

      setIsNavigating(true);

      try {
        const navigationPromise = options?.replace
          ? router.replace(href, { scroll: options.scroll })
          : router.push(href, { scroll: options.scroll });

        await navigationPromise;
      } catch (_error) {
        // Fallback to native navigation
        window.location.href = href;
      } finally {
        setIsNavigating(false);
      }
    },
    [router, isNavigating]
  );

  return { safeNavigate, isNavigating };
}
