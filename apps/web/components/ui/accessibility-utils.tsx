"use client"

import { cn } from "@repo/design-system/lib/utils"
import type React from "react"
import { useEffect, useState } from "react"

// Screen reader only text component
interface ScreenReaderOnlyProps {
  children: React.ReactNode
  className?: string
}

export function ScreenReaderOnly({
  children,
  className,
}: ScreenReaderOnlyProps) {
  return (
    <span
      className={cn(
        "-m-px sr-only absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0",
        className
      )}
    >
      {children}
    </span>
  )
}

// Focus trap component for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode
  enabled?: boolean
  initialFocus?: React.RefObject<HTMLElement>
  restoreFocus?: boolean
  className?: string
}

export function FocusTrap({
  children,
  enabled = true,
  initialFocus,
  restoreFocus = true,
  className,
}: FocusTrapProps) {
  const [previouslyFocusedElement, setPreviouslyFocusedElement] =
    useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Store the currently focused element
    setPreviouslyFocusedElement(document.activeElement as HTMLElement)

    // Focus the initial element or first focusable element
    const focusInitialElement = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus()
      } else {
        const firstFocusable = getFocusableElements()[0]
        firstFocusable?.focus()
      }
    }

    // Small delay to ensure DOM is ready
    setTimeout(focusInitialElement, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const focusableElements = getFocusableElements()
        const firstElement = focusableElements[0]
        const lastElement = focusableElements.at(-1)

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)

      // Restore focus to previously focused element
      if (restoreFocus && previouslyFocusedElement) {
        previouslyFocusedElement.focus()
      }
    }
  }, [enabled, initialFocus, restoreFocus, previouslyFocusedElement])

  const getFocusableElements = (): HTMLElement[] => {
    const selectors = [
      "button:not(:disabled)",
      "input:not(:disabled)",
      "textarea:not(:disabled)",
      "select:not(:disabled)",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ")

    return Array.from(document.querySelectorAll(selectors)) as HTMLElement[]
  }

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div className={className} role="dialog" aria-modal="true">
      {children}
    </div>
  )
}

// Live region for announcing dynamic content changes
interface LiveRegionProps {
  children: React.ReactNode
  politeness?: "polite" | "assertive" | "off"
  atomic?: boolean
  relevant?: string
  className?: string
}

export function LiveRegion({
  children,
  politeness = "polite",
  atomic = false,
  relevant = "additions text",
  className,
}: LiveRegionProps) {
  return (
    <div
      className={cn("sr-only", className)}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant as any}
    >
      {children}
    </div>
  )
}

// Skip to content link
interface SkipLinkProps {
  href?: string
  children?: React.ReactNode
  className?: string
}

export function SkipLink({
  href = "#main-content",
  children = "Skip to main content",
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "fixed top-4 left-4 z-[9999] rounded-md px-4 py-2",
        "bg-primary font-medium text-primary-foreground",
        "-translate-y-full transform opacity-0",
        "focus:translate-y-0 focus:opacity-100",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      {children}
    </a>
  )
}

// Keyboard navigation helper
interface KeyboardNavigationProps {
  children: React.ReactNode
  onEscape?: () => void
  onEnter?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  className?: string
}

export function KeyboardNavigation({
  children,
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  className,
}: KeyboardNavigationProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        onEscape?.()
        break
      case "Enter":
        onEnter?.()
        break
      case "ArrowUp": {
        event.preventDefault()
        onArrowUp?.()
        break
      }
      case "ArrowDown": {
        event.preventDefault()
        onArrowDown?.()
        break
      }
      case "ArrowLeft":
        onArrowLeft?.()
        break
      case "ArrowRight":
        onArrowRight?.()
        break
    }
  }

  return (
    <div className={className} onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}

// Reduced motion wrapper
interface ReducedMotionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ReducedMotion({ children, fallback }: ReducedMotionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return prefersReducedMotion && fallback ? fallback : children
}

// High contrast detector
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: high)")
    setIsHighContrast(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setIsHighContrast(event.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return isHighContrast
}

// Color scheme detector
export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setColorScheme(mediaQuery.matches ? "dark" : "light")

    const handleChange = (event: MediaQueryListEvent) => {
      setColorScheme(event.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return colorScheme
}

// Accessible button with enhanced keyboard support
interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  loadingText?: string
}

export function AccessibleButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText = "Loading...",
  className,
  disabled,
  ...props
}: AccessibleButtonProps) {
  const isHighContrast = useHighContrast()

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "touch-manipulation select-none",
        // Size variants
        {
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4 py-2": size === "md",
          "h-12 px-6 text-lg": size === "lg",
        },
        // Color variants
        {
          "bg-primary text-primary-foreground hover:bg-primary/90":
            variant === "primary",
          "bg-secondary text-secondary-foreground hover:bg-secondary/80":
            variant === "secondary",
          "border border-input hover:bg-accent hover:text-accent-foreground":
            variant === "outline",
          "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
        },
        // High contrast mode
        isHighContrast && "ring-2 ring-current",
        className
      )}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <ScreenReaderOnly>{loadingText}</ScreenReaderOnly>
          <span aria-hidden="true">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Accessible icon with proper labeling
interface AccessibleIconProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  decorative?: boolean
  className?: string
}

export function AccessibleIcon({
  icon: Icon,
  label,
  decorative = false,
  className,
}: AccessibleIconProps) {
  if (decorative) {
    return <Icon {...(className && { className })} aria-hidden="true" />
  }

  return (
    <>
      <Icon {...(className && { className })} aria-hidden="true" />
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
    </>
  )
}
