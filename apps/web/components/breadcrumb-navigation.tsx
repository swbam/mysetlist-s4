"use client"

import { cn } from "@repo/design-system/lib/utils"
import { ChevronRight, Home } from "lucide-react"
import Link from "next/link"

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[]
  className?: string
}

export function BreadcrumbNavigation({
  items,
  className,
}: BreadcrumbNavigationProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center space-x-2 text-muted-foreground text-sm",
        className
      )}
    >
      {/* Home link */}
      <Link
        href="/"
        className="flex items-center transition-colors hover:text-foreground"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.length > 0 && <ChevronRight className="h-4 w-4" />}

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {item.href && !item.isCurrentPage ? (
            <Link
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                item.isCurrentPage && "font-medium text-foreground"
              )}
              aria-current={item.isCurrentPage ? "page" : undefined}
            >
              {item.label}
            </span>
          )}

          {index < items.length - 1 && <ChevronRight className="h-4 w-4" />}
        </div>
      ))}
    </nav>
  )
}
