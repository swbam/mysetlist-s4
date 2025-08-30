"use client";

import { Button } from "@repo/design-system";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@repo/design-system";
import { cn } from "@repo/design-system";
import {
  Calendar,
  Home,
  MapPin,
  Menu,
  Music,
  Search,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useMemo } from "react";

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    description: "Discover trending artists and shows",
  },
  {
    href: "/artists",
    label: "Artists",
    icon: Music,
    description: "Browse and search artists",
  },
  {
    href: "/shows",
    label: "Shows",
    icon: Calendar,
    description: "Find upcoming concerts",
  },
  {
    href: "/venues",
    label: "Venues",
    icon: MapPin,
    description: "Explore concert venues",
  },
  {
    href: "/trending",
    label: "Trending",
    icon: TrendingUp,
    description: "What's hot right now",
  },
];

interface MobileNavigationProps {
  user?: any;
  className?: string;
}

export const MobileNavigation = React.memo(
  ({ user, className }: MobileNavigationProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const closeSheet = () => setIsOpen(false);

    // Memoize filtered navigation items based on user state
    const visibleNavigationItems = useMemo(
      () =>
        navigationItems.filter((item) => {
          // Hide My Artists if user is not authenticated
          if (item.href === "/my-artists" && !user) return false;
          return true;
        }),
      [user],
    );

    return (
      <div className={cn("md:hidden", className)}>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              aria-label="Toggle menu"
              data-testid="mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-80 p-0"
            data-testid="mobile-nav"
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <Music className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">TheSet</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeSheet}
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Search Section */}
              <div className="border-b p-4">
                <Link
                  href="/artists"
                  onClick={closeSheet}
                  className="flex items-center gap-3 rounded-lg border p-3 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Search className="h-4 w-4" />
                  <span>Search artists...</span>
                </Link>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4" aria-label="Main navigation">
                <ul className="space-y-2">
                  {visibleNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeSheet}
                          className={cn(
                            "flex items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors",
                            "hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon
                            className="h-5 w-5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div
                                className={cn(
                                  "text-xs mt-0.5",
                                  isActive
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
                              >
                                {item.description}
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* User Section */}
              <div className="border-t p-4">
                {user ? (
                  <div className="space-y-3">
                    <Link
                      href="/profile"
                      onClick={closeSheet}
                      className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <User className="h-5 w-5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">Profile</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/my-artists"
                      onClick={closeSheet}
                      className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <Music className="h-5 w-5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">My Artists</div>
                        <div className="text-xs text-muted-foreground">
                          Your followed artists
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={closeSheet}
                      className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Settings
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="px-3 py-2">
                      <p className="text-center text-sm text-muted-foreground">
                        Join TheSet to follow artists and vote on setlists
                      </p>
                    </div>
                    <Link href="/auth/sign-up" onClick={closeSheet}>
                      <Button className="w-full shadow-sm" size="sm">
                        Get Started
                      </Button>
                    </Link>
                    <Link href="/auth/sign-in" onClick={closeSheet}>
                      <Button variant="outline" className="w-full" size="sm">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  },
);

MobileNavigation.displayName = "MobileNavigation";
