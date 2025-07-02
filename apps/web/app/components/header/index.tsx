'use client';

import { env } from '@/env';
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
import { Menu, MoveRight, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import Image from 'next/image';
import Logo from './logo.svg';
import { UserMenu } from './user-menu';
import { RealtimeStatus } from '@/components/realtime-status';
import { SearchBar } from '../search-bar';

export const Header = () => {
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

  if (env.NEXT_PUBLIC_DOCS_URL) {
    navigationItems.push({
      title: 'Docs',
      href: env.NEXT_PUBLIC_DOCS_URL,
      description: '',
    });
  }

  const [isOpen, setOpen] = useState(false);
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
                          <Link href={item.href}>{item.title}</Link>
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
                              <Link href="/contact">
                                Get Started
                              </Link>
                            </Button>
                          </div>
                          <div className="flex h-full flex-col justify-end text-sm">
                            <NavigationMenuLink
                              href={item.href}
                              className="flex flex-row items-center justify-between rounded px-4 py-2 hover:bg-muted"
                            >
                              <span>Go to {item.title}</span>
                              <MoveRight className="h-4 w-4 text-muted-foreground" />
                            </NavigationMenuLink>
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
          <Image
            src={Logo}
            alt="Logo"
            width={24}
            height={24}
            className="dark:invert"
          />
          <p className="whitespace-nowrap font-semibold">MySetlist</p>
        </div>
        <div className="flex w-full justify-end gap-4">
          <div className="hidden lg:block flex-1 max-w-md">
            <SearchBar />
          </div>
          <Button variant="ghost" className="hidden md:inline" asChild>
            <Link href="/contact">Contact</Link>
          </Button>
          <div className="hidden border-r md:inline" />
          <div className="hidden md:inline">
            <ModeToggle />
          </div>
          <div className="hidden md:inline">
            <RealtimeStatus />
          </div>
          <UserMenu />
        </div>
        <div className="flex w-12 shrink items-end justify-end lg:hidden">
          <Button variant="ghost" onClick={() => setOpen(!isOpen)}>
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {isOpen && (
            <div className="container absolute top-20 right-0 flex w-full flex-col gap-8 border-t bg-background py-4 shadow-lg">
              {navigationItems.map((item) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-2">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="flex items-center justify-between"
                        target={
                          item.href.startsWith('http') ? '_blank' : undefined
                        }
                        rel={
                          item.href.startsWith('http')
                            ? 'noopener noreferrer'
                            : undefined
                        }
                      >
                        <span className="text-lg">{item.title}</span>
                        <MoveRight className="h-4 w-4 stroke-1 text-muted-foreground" />
                      </Link>
                    ) : (
                      <Link
                        href={item.href}
                        className="flex items-center justify-between"
                      >
                        <span className="text-lg">{item.title}</span>
                        <MoveRight className="h-4 w-4 stroke-1 text-muted-foreground" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
