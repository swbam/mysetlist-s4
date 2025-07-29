"use client";

import { cn } from "@repo/design-system/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

const routeMap: Record<string, string> = {
  "/": "Home",
  "/artists": "Artists",
  "/shows": "Shows",
  "/venues": "Venues",
  "/trending": "Trending",
  "/my-artists": "My Artists",
  "/search": "Search",
  "/profile": "Profile",
  "/settings": "Settings",
  "/auth/sign-in": "Sign In",
  "/auth/sign-up": "Sign Up",
  "/contact": "Contact",
  "/about": "About",
  "/privacy": "Privacy",
  "/terms": "Terms",
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  let currentPath = "";
  for (const path of paths) {
    currentPath += `/${path}`;
    const label =
      routeMap[currentPath] || path.charAt(0).toUpperCase() + path.slice(1);
    breadcrumbs.push({
      label,
      href: currentPath,
    });
  }

  // Mark the last item as current
  if (breadcrumbs.length > 0) {
    const lastItem = breadcrumbs[breadcrumbs.length - 1];
    if (lastItem) {
      lastItem.current = true;
    }
  }

  return breadcrumbs;
}

interface NavigationFeedbackProps {
  showBreadcrumbs?: boolean;
  className?: string;
}

export function EnhancedNavigationFeedback({
  showBreadcrumbs = true,
  className,
}: NavigationFeedbackProps) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    if (showBreadcrumbs) {
      setBreadcrumbs(generateBreadcrumbs(pathname));
    }
  }, [pathname, showBreadcrumbs]);

  // Handle navigation state
  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleComplete = () => setIsNavigating(false);

    // Listen for navigation events (this is a simplified version)
    // In a real app, you might use Next.js router events
    window.addEventListener("beforeunload", handleStart);

    return () => {
      window.removeEventListener("beforeunload", handleStart);
      handleComplete();
    };
  }, []);

  if (!showBreadcrumbs || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className={cn("border-b bg-muted/30 py-3", className)}>
      <div className="container mx-auto">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1">
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={breadcrumb.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />
              )}
              {breadcrumb.current ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {breadcrumb.label}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className={cn(
                    "text-sm transition-colors hover:text-foreground",
                    index === 0
                      ? "text-muted-foreground hover:text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {index === 0 && (
                    <Home className="mr-1 inline h-4 w-4" aria-hidden="true" />
                  )}
                  {breadcrumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Navigation Loading State */}
        {isNavigating && (
          <div className="mt-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-pulse bg-primary" />
            </div>
            <span className="sr-only">Navigating...</span>
          </div>
        )}
      </div>
    </div>
  );
}
