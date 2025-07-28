import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Grid breakpoint utilities
export const gridBreakpoints = {
  artists: {
    mobile: "grid-cols-1",
    sm: "sm:grid-cols-2",
    md: "md:grid-cols-3",
    lg: "lg:grid-cols-4",
    xl: "xl:grid-cols-5",
    "2xl": "2xl:grid-cols-6",
  },
  venues: {
    mobile: "grid-cols-1",
    sm: "sm:grid-cols-2",
    md: "md:grid-cols-2",
    lg: "lg:grid-cols-3",
    xl: "xl:grid-cols-4",
    "2xl": "2xl:grid-cols-4",
  },
  shows: {
    mobile: "grid-cols-1",
    sm: "sm:grid-cols-1",
    md: "md:grid-cols-2",
    lg: "lg:grid-cols-3",
    xl: "xl:grid-cols-3",
    "2xl": "2xl:grid-cols-4",
  },
  default: {
    mobile: "grid-cols-1",
    sm: "sm:grid-cols-2",
    md: "md:grid-cols-3",
    lg: "lg:grid-cols-4",
    xl: "xl:grid-cols-4",
    "2xl": "2xl:grid-cols-5",
  },
} as const

// Gap utilities for different screen sizes
export const gridGaps = {
  mobile: "gap-4",
  sm: "sm:gap-4",
  md: "md:gap-6",
  lg: "lg:gap-6",
  xl: "xl:gap-8",
} as const

// Generate responsive grid classes
export function generateGridClasses(variant: keyof typeof gridBreakpoints) {
  const breakpoints = gridBreakpoints[variant]
  const gaps = Object.values(gridGaps)

  return cn(
    "grid",
    breakpoints.mobile,
    breakpoints.sm,
    breakpoints.md,
    breakpoints.lg,
    breakpoints.xl,
    breakpoints["2xl"],
    ...gaps
  )
}

// Accessibility helpers
export const gridAriaLabels = {
  artists: "Grid of artists",
  venues: "Grid of venues",
  shows: "Grid of shows",
  default: "Content grid",
} as const

// Touch target sizes for mobile optimization
export const touchTargets = {
  minimum: "min-h-[44px] min-w-[44px]", // WCAG AA minimum
  comfortable: "min-h-[48px] min-w-[48px]", // Recommended
  large: "min-h-[56px] min-w-[56px]", // For primary actions
} as const

// Focus ring utilities
export const focusRing = {
  default:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  card: "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
  button:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
} as const

// Animation utilities for better UX
export const animations = {
  scale: "transition-transform duration-200 hover:scale-[1.02]",
  shadow: "transition-shadow duration-200 hover:shadow-lg",
  colors: "transition-colors duration-200",
  all: "transition-all duration-200",
} as const
