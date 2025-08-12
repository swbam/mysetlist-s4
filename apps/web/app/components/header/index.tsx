"use client";

import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@repo/design-system/components/ui/navigation-menu";
import { MoveRight } from "lucide-react";
import React, { useMemo } from "react";
import { useAuth } from "~/app/providers/auth-provider";

import Image from "next/image";
import { MobileNavigation } from "~/app/components/mobile/mobile-navigation";
import { MobileSearch } from "~/app/components/mobile/mobile-search";
import {
  NavigationErrorBoundary,
  SafeLink,
} from "~/components/navigation/navigation-error-boundary";
import { RealtimeStatus } from "~/components/realtime-status";
import { SearchBar } from "~/components/search-bar";
import Logo from "./logo.svg";
import { UserMenu } from "./user-menu";

const HeaderContent = React.memo(() => {
  const { user } = useAuth();

  const navigationItems = useMemo(
    () => [
      {
        title: "Home",
        href: "/",
        description: "",
      },
      {
        title: "Artists",
        href: "/artists",
        description: "",
      },
      ...(user
        ? [
            {
              title: "My Artists",
              href: "/my-artists",
              description: "",
            },
          ]
        : []),
      {
        title: "Shows",
        href: "/shows",
        description: "",
      },
      {
        title: "Venues",
        href: "/venues",
        description: "",
      },
      {
        title: "Trending",
        href: "/trending",
        description: "",
      },
    ],
    [user],
  );

  return (
    <header className="sticky top-0 left-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container relative mx-auto flex min-h-16 flex-row items-center justify-between gap-2 px-4 sm:gap-4 lg:min-h-20 lg:grid lg:grid-cols-3">
        <div className="hidden flex-row items-center justify-start gap-4 lg:flex">
          <NavigationMenu className="flex items-start justify-start">
            <NavigationMenuList className="flex flex-row justify-start gap-4">
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  {item.href ? (
                    <>
                      <NavigationMenuLink asChild>
                        <Button variant="ghost" asChild>
                          {item.href.startsWith("http") ? (
                            <SafeLink
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              prefetch={false}
                            >
                              {item.title}
                            </SafeLink>
                          ) : (
                            <SafeLink href={item.href} prefetch={true}>
                              {item.title}
                            </SafeLink>
                          )}
                        </Button>
                      </NavigationMenuLink>
                    </>
                  ) : (
                    <>
                      <NavigationMenuTrigger className="font-medium text-sm">
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="!w-[450px] p-4">
                        <div className="flex grid-cols-2 flex-col gap-4 lg:grid">
                          <div className="flex h-full flex-col justify-between">
                            <div className="flex flex-col">
                              <p className="text-base">{item.title}</p>
                              <p className="text-muted-foreground text-sm">
                                {item.description}
                              </p>
                            </div>
                            <Button size="sm" className="mt-10" asChild>
                              <SafeLink href="/contact">Get Started</SafeLink>
                            </Button>
                          </div>
                          <div className="flex h-full flex-col justify-end text-sm">
                            {item.href && (
                              <NavigationMenuLink asChild>
                                <SafeLink
                                  href={item.href}
                                  className="flex flex-row items-center justify-between rounded px-4 py-2 hover:bg-muted"
                                >
                                  <span>Go to {item.title}</span>
                                  <MoveRight className="h-4 w-4 text-muted-foreground" />
                                </SafeLink>
                              </NavigationMenuLink>
                            )}
                          </div>
                        </div>
                      </NavigationMenuContent>
                    </>
                  )}
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex items-center gap-2 lg:justify-center">
          <SafeLink
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md p-1"
            prefetch
            aria-label="TheSet Home"
          >
            <Image
              src={Logo}
              alt="TheSet Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <p className="whitespace-nowrap font-semibold text-base sm:text-lg">
              TheSet
            </p>
          </SafeLink>
        </div>
        <div className="flex items-center justify-end gap-1 sm:gap-2 lg:gap-4">
          <div className="hidden max-w-md flex-1 lg:block">
            <SearchBar variant="artists-only" placeholder="Search artists..." />
          </div>
          <div className="max-w-[160px] flex-1 sm:max-w-[200px] lg:hidden">
            <MobileSearch />
          </div>
          {!user && (
            <>
              <Button
                variant="ghost"
                className="hidden xl:inline-flex"
                size="sm"
                asChild
              >
                <SafeLink href="/contact">Contact</SafeLink>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="inline-flex transition-colors hover:bg-muted/80 font-medium text-xs sm:text-sm"
                asChild
              >
                <SafeLink href="/auth/sign-in">Sign in</SafeLink>
              </Button>
              <Button
                size="sm"
                className="inline-flex bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs sm:text-sm"
                asChild
              >
                <SafeLink href="/auth/sign-up">Get Started</SafeLink>
              </Button>
            </>
          )}
          {user && (
            <Button
              variant="ghost"
              className="hidden xl:inline-flex"
              size="sm"
              asChild
            >
              <SafeLink href="/contact">Contact</SafeLink>
            </Button>
          )}
          <div className="hidden border-r xl:inline" />
          <div className="hidden xl:inline">
            <ModeToggle />
          </div>
          <div className="hidden xl:inline">
            <RealtimeStatus />
          </div>
          <UserMenu />
          <MobileNavigation className="lg:hidden" user={user} />
        </div>
      </div>
    </header>
  );
});

HeaderContent.displayName = "HeaderContent";

export const Header = () => {
  return (
    <NavigationErrorBoundary>
      <HeaderContent />
    </NavigationErrorBoundary>
  );
};
