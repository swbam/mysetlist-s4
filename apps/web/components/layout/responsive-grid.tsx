import { cn } from "@repo/design-system/lib/utils"
import React from "react"
import { focusRing, generateGridClasses, gridAriaLabels } from "./grid-utils"

type ResponsiveGridProps = {
  className?: string
  variant?: "artists" | "venues" | "shows" | "default"
  emptyState?: React.ReactNode
  ariaLabel?: string
} & (
  | {
      loading: true
      loadingCount?: number
      children?: React.ReactNode
    }
  | {
      loading?: false
      loadingCount?: never
      children: React.ReactNode
    }
)

interface GridSkeletonProps {
  count: number
  variant: ResponsiveGridProps["variant"]
}

const GridSkeleton: React.FC<GridSkeletonProps> = ({ count, variant }) => {
  const getSkeletonClasses = () => {
    const baseClasses = "animate-pulse rounded-lg bg-muted"

    switch (variant) {
      case "artists":
        return `${baseClasses} aspect-square`
      case "venues":
        return `${baseClasses} h-80`
      case "shows":
        return `${baseClasses} h-40`
      default:
        return `${baseClasses} h-60`
    }
  }

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={`skeleton-${index}`}
          className={getSkeletonClasses()}
          role="gridcell"
          aria-label="Loading content"
        />
      ))}
    </>
  )
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = (props) => {
  const {
    children,
    className,
    variant = "default",
    emptyState,
    ariaLabel,
  } = props

  const loading = "loading" in props ? props.loading : false
  const loadingCount = "loadingCount" in props ? props.loadingCount || 8 : 8
  const gridClasses = generateGridClasses(variant)
  const defaultAriaLabel = gridAriaLabels[variant]

  // Handle loading state
  if (loading) {
    return (
      <div
        className={cn(gridClasses, focusRing.card, className)}
        role="grid"
        aria-label={ariaLabel || `Loading ${defaultAriaLabel.toLowerCase()}`}
        aria-busy="true"
      >
        <GridSkeleton count={loadingCount} variant={variant} />
      </div>
    )
  }

  // Handle empty state
  const childArray = React.Children.toArray(children)
  if (childArray.length === 0 && emptyState) {
    return (
      <div
        role="region"
        aria-label={ariaLabel || `Empty ${defaultAriaLabel.toLowerCase()}`}
      >
        {emptyState}
      </div>
    )
  }

  return (
    <div
      className={cn(gridClasses, focusRing.card, className)}
      role="grid"
      aria-label={ariaLabel || defaultAriaLabel}
      aria-rowcount={Math.ceil(childArray.length / 4)} // Approximation
      aria-colcount={4} // Approximation for desktop
    >
      {children}
    </div>
  )
}

// Utility components for empty states
export const EmptyState: React.FC<{
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mb-6 max-w-md text-muted-foreground">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}

export default ResponsiveGrid
