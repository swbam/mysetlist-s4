'use client';

import { useEffect } from 'react';

export function AccessibilityEnhancements() {
  useEffect(() => {
    // Ensure we're on the client before accessing browser APIs
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let handleKeyDown: ((e: KeyboardEvent) => void) | undefined;
    let handleReducedMotion: ((e: MediaQueryListEvent | MediaQueryList) => void) | undefined;
    let mediaQuery: MediaQueryList | undefined;

    // Add small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        // Enhanced focus management for keyboard navigation
        handleKeyDown = (e: KeyboardEvent) => {
          try {
            // Skip links functionality
            if (e.key === 'Tab' && e.shiftKey === false) {
              const firstFocusable = document.querySelector('[data-skip-to-content]') as HTMLElement;
              if (document.activeElement === document.body && firstFocusable) {
                e.preventDefault();
                firstFocusable.focus();
              }
            }
          } catch (error) {
            console.warn('Focus management error:', error);
          }
        };

        // Reduced motion preferences
        mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        handleReducedMotion = (e: MediaQueryListEvent | MediaQueryList) => {
          try {
            if (e.matches) {
              document.documentElement.style.setProperty('--animation-duration', '0.01ms');
              document.documentElement.style.setProperty('--animation-delay', '0ms');
            } else {
              // Reset to default values when reduced motion is not preferred
              document.documentElement.style.removeProperty('--animation-duration');
              document.documentElement.style.removeProperty('--animation-delay');
            }
          } catch (error) {
            console.warn('Reduced motion handling error:', error);
          }
        };

        document.addEventListener('keydown', handleKeyDown);
        mediaQuery.addEventListener('change', handleReducedMotion);
        handleReducedMotion(mediaQuery);
      } catch (error) {
        console.warn('Accessibility setup error:', error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      try {
        if (handleKeyDown) {
          document.removeEventListener('keydown', handleKeyDown);
        }
        if (mediaQuery && handleReducedMotion) {
          mediaQuery.removeEventListener('change', handleReducedMotion);
        }
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    };
  }, []);

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        data-skip-to-content
        className="sr-only fixed top-4 left-4 z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground transition-all focus:not-sr-only focus:translate-y-0"
      >
        Skip to main content
      </a>

      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="sr-announcements"
      />

      {/* High contrast mode support */}
      <style jsx>{`
        @media (prefers-contrast: high) {
          :root {
            --background: 255 255 255;
            --foreground: 0 0 0;
            --muted: 245 245 245;
            --muted-foreground: 64 64 64;
            --border: 0 0 0;
            --primary: 0 0 0;
            --primary-foreground: 255 255 255;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}

export default AccessibilityEnhancements;