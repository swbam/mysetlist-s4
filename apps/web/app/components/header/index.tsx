'use client';

import { useAuth } from '@/app/providers/auth-provider';
import { ModeToggle } from '@repo/design-system/components/mode-toggle';
import { Button } from '@repo/design-system/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@repo/design-system/components/ui/navigation-menu';
import { MoveRight } from 'lucide-react';
import Link from 'next/link';

import { MobileNavigation } from '@/components/mobile/mobile-navigation';
import { NavigationErrorBoundary } from '@/components/navigation/navigation-error-boundary';
import { RealtimeStatus } from '@/components/realtime-status';
import Image from 'next/image';
import { SearchBar } from '../search-bar';
import Logo from './logo.svg';
import { UserMenu } from './user-menu';

const HeaderContent = () => {
  const { user } = useAuth();

  const navigationItems = [
    {
      title: 'Home',
      href: '/',
      description: '',
    },
    {
      title: 'Artists',
      href: '/artists',
      description: '',
    },
    ...(user
      ? [
          {
            title: 'My Artists',
            href: '/my-artists',
            description: '',
          },
        ]
      : []),
    {
      title: 'Shows',
      href: '/shows',
      description: '',
    },
    {
      title: 'Venues',
      href: '/venues',
      description: '',
    },
    {
      title: 'Trending',
      href: '/trending',
      description: '',
    },
  ];

  return (
    <header className="sticky top-0 left-0 z-40 w-full border-b bg-background">
      <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 lg:grid lg:grid-cols-3">
        <div className="hidden flex-row items-center justify-start gap-4 lg:flex">
          <NavigationMenu className="flex items-start justify-start">
            <NavigationMenuList className="flex flex-row justify-start gap-4">
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  {item.href ? (
                    <>
                      <NavigationMenuLink asChild>
                        <Button variant="ghost" asChild>
                          <Link
                            href={item.href}
                            target={
                              item.href.startsWith('http')
                                ? '_blank'
                                : undefined
                            }
                            rel={
                              item.href.startsWith('http')
                                ? 'noopener noreferrer'
                                : undefined
                            }
                          >
                            {item.title}
                          </Link>
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
                              <Link href="/contact">Get Started</Link>
                            </Button>
                          </div>
                          <div className="flex h-full flex-col justify-end text-sm">
                            {item.href && (
                              <NavigationMenuLink
                                href={item.href}
                                className="flex flex-row items-center justify-between rounded px-4 py-2 hover:bg-muted"
                              >
                                <span>Go to {item.title}</span>
                                <MoveRight className="h-4 w-4 text-muted-foreground" />
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
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src={Logo}
              alt="Logo"
              width={24}
              height={24}
              className="dark:invert"
            />
            <p className="whitespace-nowrap font-semibold">MySetlist</p>
          </Link>
        </div>
        <div className="flex w-full justify-end gap-4">
          <div className="hidden max-w-md flex-1 lg:block">
            <SearchBar />
          </div>
          <Button variant="ghost" className="hidden md:inline" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
          {!user && (
            <>
              <Button variant="ghost" className="hidden md:inline" size="sm" asChild>
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
              <Button className="hidden md:inline" size="sm" asChild>
                <Link href="/auth/sign-up">Sign up</Link>
              </Button>
            </>
          )}
          <div className="hidden border-r md:inline" />
          <div className="hidden md:inline">
            <ModeToggle />
          </div>
          <div className="hidden md:inline">
            <RealtimeStatus />
          </div>
          <UserMenu />
          <MobileNavigation className="lg:hidden" user={user} />
        </div>
      </div>
    </header>
  );
};

export const Header = () => {
  return (
    <NavigationErrorBoundary>
      <HeaderContent />
    </NavigationErrorBoundary>
  );
};
