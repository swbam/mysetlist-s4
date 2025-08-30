"use client";

import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { cn } from "@repo/design-system";
import {
  Accessibility,
  Contrast,
  Eye,
  EyeOff,
  Keyboard,
  Type,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

// Focus management hook
export function useFocusManagement() {
  const previousFocus = useRef<HTMLElement | null>(null);
  const focusTraps = useRef<Set<HTMLElement>>(new Set());

  const saveFocus = useCallback(() => {
    previousFocus.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocus.current && document.contains(previousFocus.current)) {
      previousFocus.current.focus();
    }
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select',
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    focusTraps.current.add(container);
    firstElement.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      focusTraps.current.delete(container);
    };
  }, []);

  const releaseFocusTraps = useCallback(() => {
    focusTraps.current.clear();
  }, []);

  return {
    saveFocus,
    restoreFocus,
    trapFocus,
    releaseFocusTraps,
  };
}

// Keyboard navigation component
interface KeyboardNavigationProps {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical" | "both";
  wrap?: boolean;
  className?: string;
}

export const KeyboardNavigation = memo(function KeyboardNavigation({
  children,
  orientation = "both",
  wrap = true,
  className,
}: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = Array.from(
        containerRef.current.querySelectorAll(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ) as HTMLElement[];

      if (focusableElements.length === 0) return;

      let newIndex = currentIndex;

      switch (e.key) {
        case "ArrowRight":
          if (orientation === "horizontal" || orientation === "both") {
            e.preventDefault();
            newIndex = wrap
              ? (currentIndex + 1) % focusableElements.length
              : Math.min(currentIndex + 1, focusableElements.length - 1);
          }
          break;
        case "ArrowLeft":
          if (orientation === "horizontal" || orientation === "both") {
            e.preventDefault();
            newIndex = wrap
              ? (currentIndex - 1 + focusableElements.length) %
                focusableElements.length
              : Math.max(currentIndex - 1, 0);
          }
          break;
        case "ArrowDown":
          if (orientation === "vertical" || orientation === "both") {
            e.preventDefault();
            newIndex = wrap
              ? (currentIndex + 1) % focusableElements.length
              : Math.min(currentIndex + 1, focusableElements.length - 1);
          }
          break;
        case "ArrowUp":
          if (orientation === "vertical" || orientation === "both") {
            e.preventDefault();
            newIndex = wrap
              ? (currentIndex - 1 + focusableElements.length) %
                focusableElements.length
              : Math.max(currentIndex - 1, 0);
          }
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = focusableElements.length - 1;
          break;
      }

      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        focusableElements[newIndex]?.focus();
      }
    },
    [currentIndex, orientation, wrap],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className={cn("focus-within:outline-none", className)}
      role="group"
      aria-label="Keyboard navigable content"
    >
      {children}
    </div>
  );
});

// Screen reader announcements
export function useScreenReaderAnnouncements() {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      setAnnouncements((prev) => [...prev, message]);

      // Create temporary element for screen reader
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", priority);
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = message;

      document.body.appendChild(announcement);

      // Remove after announcement
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    },
    [],
  );

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  return { announce, clearAnnouncements, announcements };
}

// High contrast mode toggle
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast((prev) => {
      const newValue = !prev;
      document.documentElement.classList.toggle("high-contrast", newValue);
      localStorage.setItem("high-contrast-mode", newValue.toString());
      return newValue;
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("high-contrast-mode");
    if (saved === "true") {
      setIsHighContrast(true);
      document.documentElement.classList.add("high-contrast");
    }
  }, []);

  return { isHighContrast, toggleHighContrast };
}

// Reduced motion toggle
export function useReducedMotion() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const toggleReducedMotion = useCallback(() => {
    setIsReducedMotion((prev) => {
      const newValue = !prev;
      document.documentElement.classList.toggle("reduce-motion", newValue);
      localStorage.setItem("reduced-motion", newValue.toString());
      return newValue;
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("reduced-motion");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (saved === "true" || prefersReducedMotion) {
      setIsReducedMotion(true);
      document.documentElement.classList.add("reduce-motion");
    }
  }, []);

  return { isReducedMotion, toggleReducedMotion };
}

// Font size adjustment
export function useFontSizeAdjustment() {
  const [fontSize, setFontSize] = useState(16);

  const adjustFontSize = useCallback((delta: number) => {
    setFontSize((prev) => {
      const newSize = Math.max(14, Math.min(24, prev + delta));
      document.documentElement.style.fontSize = `${newSize}px`;
      localStorage.setItem("font-size", newSize.toString());
      return newSize;
    });
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSize(16);
    document.documentElement.style.fontSize = "16px";
    localStorage.removeItem("font-size");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("font-size");
    if (saved) {
      const size = Number.parseInt(saved, 10);
      setFontSize(size);
      document.documentElement.style.fontSize = `${size}px`;
    }
  }, []);

  return { fontSize, adjustFontSize, resetFontSize };
}

// Skip links component
interface SkipLinksProps {
  links: Array<{
    href: string;
    label: string;
  }>;
}

export const SkipLinks = memo(function SkipLinks({ links }: SkipLinksProps) {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-primary text-primary-foreground p-2 space-x-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="bg-primary text-primary-foreground px-3 py-1 rounded focus:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
});

// Accessibility preferences panel
interface AccessibilityPreferencesProps {
  className?: string;
}

export const AccessibilityPreferences = memo(function AccessibilityPreferences({
  className,
}: AccessibilityPreferencesProps) {
  const { isHighContrast, toggleHighContrast } = useHighContrastMode();
  const { isReducedMotion, toggleReducedMotion } = useReducedMotion();
  const { fontSize, adjustFontSize, resetFontSize } = useFontSizeAdjustment();
  const { announce } = useScreenReaderAnnouncements();

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="h-5 w-5" />
          Accessibility Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Contrast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4" />
            <span className="text-sm">High Contrast</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toggleHighContrast();
              announce(
                isHighContrast
                  ? "High contrast mode disabled"
                  : "High contrast mode enabled",
              );
            }}
            aria-pressed={isHighContrast}
          >
            {isHighContrast ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm">Reduce Motion</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toggleReducedMotion();
              announce(
                isReducedMotion
                  ? "Reduced motion disabled"
                  : "Reduced motion enabled",
              );
            }}
            aria-pressed={isReducedMotion}
          >
            {isReducedMotion ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <span className="text-sm">Font Size</span>
            <Badge variant="outline">{fontSize}px</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                adjustFontSize(-2);
                announce("Font size decreased");
              }}
              aria-label="Decrease font size"
            >
              A-
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetFontSize();
                announce("Font size reset to default");
              }}
              aria-label="Reset font size"
            >
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                adjustFontSize(2);
                announce("Font size increased");
              }}
              aria-label="Increase font size"
            >
              A+
            </Button>
          </div>
        </div>

        {/* Keyboard Navigation Help */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="h-4 w-4" />
            <span className="text-sm font-medium">Keyboard Navigation</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Tab: Move to next element</p>
            <p>• Shift + Tab: Move to previous element</p>
            <p>• Arrow keys: Navigate within components</p>
            <p>• Space/Enter: Activate buttons and links</p>
            <p>• Escape: Close dialogs and menus</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ARIA live region for dynamic content
export const LiveRegion = memo(function LiveRegion({
  children,
  priority = "polite",
  atomic = false,
}: {
  children: React.ReactNode;
  priority?: "polite" | "assertive" | "off";
  atomic?: boolean;
}) {
  return (
    <div aria-live={priority} aria-atomic={atomic} className="sr-only">
      {children}
    </div>
  );
});

// Enhanced button with better accessibility
interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  describedBy?: string;
}

export const AccessibleButton = memo(function AccessibleButton({
  children,
  variant = "default",
  size = "md",
  loading = false,
  loadingText = "Loading...",
  describedBy,
  className,
  ...props
}: AccessibleButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        "focus:ring-2 focus:ring-offset-2 focus:ring-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      aria-busy={loading}
      aria-describedby={describedBy}
      aria-disabled={props.disabled || loading}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </Button>
  );
});

// Color contrast checker
export function useColorContrast() {
  const getContrastRatio = useCallback((color1: string, color2: string) => {
    // This is a simplified version - in production you'd use a proper color library
    const getLuminance = (color: string) => {
      // Simple luminance calculation
      const hex = color.replace("#", "");
      const r = Number.parseInt(hex.substr(0, 2), 16) / 255;
      const g = Number.parseInt(hex.substr(2, 2), 16) / 255;
      const b = Number.parseInt(hex.substr(4, 2), 16) / 255;

      const gamma = 2.4;
      const rs = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** gamma;
      const gs = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** gamma;
      const bs = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** gamma;

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const bright = Math.max(l1, l2);
    const dark = Math.min(l1, l2);

    return (bright + 0.05) / (dark + 0.05);
  }, []);

  const checkContrast = useCallback(
    (foreground: string, background: string) => {
      const ratio = getContrastRatio(foreground, background);
      return {
        ratio,
        aa: ratio >= 4.5,
        aaa: ratio >= 7,
        aaLarge: ratio >= 3,
        aaaLarge: ratio >= 4.5,
      };
    },
    [getContrastRatio],
  );

  return { checkContrast };
}
