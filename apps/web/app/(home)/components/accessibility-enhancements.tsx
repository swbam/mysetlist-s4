"use client";

import { useEffect } from "react";

export function AccessibilityEnhancements() {
  useEffect(() => {
    // Enhanced focus management for keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip links functionality
      if (e.key === "Tab" && e.shiftKey === false) {
        const firstFocusable = document.querySelector(
          "[data-skip-to-content]",
        ) as HTMLElement;
        if (document.activeElement === document.body && firstFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    // Reduced motion preferences
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleReducedMotion = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.style.setProperty(
          "--animation-duration",
          "0.01ms",
        );
        document.documentElement.style.setProperty("--animation-delay", "0ms");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    mediaQuery.addEventListener("change", handleReducedMotion);
    handleReducedMotion(mediaQuery);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      mediaQuery.removeEventListener("change", handleReducedMotion);
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
