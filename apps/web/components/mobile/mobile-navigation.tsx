"use client";

import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import { cn } from "@repo/design-system/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Calendar,
  Headphones,
  Heart,
  Home,
  MapPin,
  Menu,
  Music,
  Settings,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

interface MobileNavigationProps {
  className?: string;
  user?: any;
  notificationCount?: number;
}

const navigationItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    description: "Discover trending shows",
  },
  {
    title: "Artists",
    href: "/artists",
    icon: Music,
    description: "Browse music artists",
  },
  {
    title: "Shows",
    href: "/shows",
    icon: Calendar,
    description: "Upcoming & past shows",
  },
  {
    title: "Venues",
    href: "/venues",
    icon: MapPin,
    description: "Concert venues & locations",
  },
];

const userMenuItems = [
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    description: "Your profile & activity",
  },
  {
    title: "Following",
    href: "/profile/following",
    icon: Heart,
    description: "Artists you follow",
  },
  {
    title: "Playlists",
    href: "/playlists",
    icon: Headphones,
    description: "Your saved setlists",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Account & preferences",
  },
];

export const MobileNavigation = React.memo(function MobileNavigation({
  className,
  user,
  notificationCount = 0,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Close menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(false);
    };

    // Listen for navigation events
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  };

  const handleLinkClick = () => {
    handleClose();
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <div className={cn("flex md:hidden", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative h-10 w-10 p-0"
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <Menu className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center p-0 text-xs"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={handleClose}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: isClosing ? "-100%" : 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3,
              }}
              className="fixed top-0 left-0 z-50 h-full w-80 max-w-[90vw] bg-background shadow-xl md:hidden overflow-y-auto"
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                      <Music className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-semibold text-lg">TheSet</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {/* User Section */}
                  {user && (
                    <div className="border-b p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {user.name || user.email}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Notifications */}
                      {notificationCount > 0 && (
                        <Link
                          href="/notifications"
                          onClick={handleLinkClick}
                          className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 transition-colors hover:bg-muted"
                        >
                          <Bell className="h-4 w-4" />
                          <span className="text-sm">Notifications</span>
                          <Badge variant="secondary" className="ml-auto">
                            {notificationCount}
                          </Badge>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Main Navigation */}
                  <div className="p-4">
                    <nav className="space-y-2">
                      {navigationItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleLinkClick}
                            className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                            prefetch
                          >
                            <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {item.title}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {item.description}
                              </p>
                            </div>
                          </Link>
                        );
                      })}

                      {/* My Artists link for authenticated users */}
                      {user && (
                        <Link
                          href="/my-artists"
                          onClick={handleLinkClick}
                          className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                          prefetch
                        >
                          <Heart className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">My Artists</p>
                            <p className="text-muted-foreground text-xs">
                              Your followed artists & shows
                            </p>
                          </div>
                        </Link>
                      )}
                    </nav>
                  </div>

                  {/* User Menu */}
                  {user && (
                    <>
                      <Separator />
                      <div className="p-4">
                        <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Account
                        </p>
                        <nav className="space-y-2">
                          {userMenuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleLinkClick}
                                className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                              >
                                <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {item.title}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {item.description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </nav>
                      </div>
                    </>
                  )}

                  {/* Auth Actions */}
                  {!user && (
                    <>
                      <Separator />
                      <div className="space-y-2 p-4">
                        <Button asChild className="w-full" size="sm">
                          <Link href="/auth/sign-in" onClick={handleLinkClick}>
                            Sign In
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full"
                          size="sm"
                        >
                          <Link href="/auth/sign-up" onClick={handleLinkClick}>
                            Sign Up
                          </Link>
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Theme</span>
                    <ModeToggle />
                  </div>
                  <p className="text-center text-muted-foreground text-xs">
                    TheSet © 2024
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
