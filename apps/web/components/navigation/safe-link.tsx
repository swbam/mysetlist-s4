'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

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
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Call custom onClick if provided
      if (onClick) {
        onClick(e);
      }

      // Don't intercept external links or special targets
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target === '_blank' ||
        e.defaultPrevented
      ) {
        return;
      }

      // For internal navigation, let Next.js Link handle it naturally
      // Only intercept on error
    },
    [href, onClick, target]
  );

  // For external links, use regular Link behavior
  if (
    href.startsWith('http') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    const linkProps: any = {
      href,
      className,
      target,
      rel,
      ...props,
    };
    
    if (onClick) {
      linkProps.onClick = onClick;
    }
    
    return (
      <Link {...linkProps}>
        <>{children}</>
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
      <>{children}</>
    </Link>
  );
};

// Hook for safe navigation
export function useSafeNavigation() {
  const router = useRouter();

  const safeNavigate = React.useCallback(
    async (href: string, options?: { replace?: boolean; scroll?: boolean }) => {
      try {
        if (options?.replace) {
          await router.replace(href, { scroll: options.scroll ?? true });
        } else {
          await router.push(href, { scroll: options?.scroll ?? true });
        }
      } catch (_error) {
        // Fallback to native navigation
        window.location.href = href;
      }
    },
    [router]
  );

  return { safeNavigate };
}
