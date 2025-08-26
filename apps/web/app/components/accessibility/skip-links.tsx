"use client";

import { Button } from "@repo/design-system/button";
import { cn } from "@repo/design-system";

interface SkipLink {
  href: string;
  label: string;
}

const skipLinks: SkipLink[] = [
  { href: "#main-content", label: "Skip to main content" },
  { href: "#navigation", label: "Skip to navigation" },
  { href: "#search", label: "Skip to search" },
  { href: "#footer", label: "Skip to footer" },
];

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 flex gap-2 bg-background p-2 shadow-lg">
        {skipLinks.map((link) => (
          <Button
            key={link.href}
            asChild
            variant="outline"
            size="sm"
            className={cn(
              "focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50",
              "focus:bg-primary focus:text-primary-foreground",
            )}
          >
            <a href={link.href}>{link.label}</a>
          </Button>
        ))}
      </div>
    </div>
  );
}

// Screen reader announcements component
export function ScreenReaderAnnouncements() {
  return (
    <div
      id="screen-reader-announcements"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

// Focus management hook
export function useFocusManagement() {
  const announceToScreenReader = (message: string) => {
    const announcer = document.getElementById("screen-reader-announcements");
    if (announcer) {
      announcer.textContent = message;
      // Clear after a short delay to allow for re-announcements
      setTimeout(() => {
        announcer.textContent = "";
      }, 1000);
    }
  };

  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      return true;
    }
    return false;
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  };

  return {
    announceToScreenReader,
    focusElement,
    trapFocus,
  };
}
