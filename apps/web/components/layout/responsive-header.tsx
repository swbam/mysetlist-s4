'use client';

import { ThemeToggle } from '@/components/ui/theme-provider';
import { useAuth } from '@repo/auth';
import { Button } from '@repo/design-system';
import { SearchBox } from '@repo/design-system';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system';
import { Badge } from '@repo/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system';
import { cn } from '@repo/design-system/lib/utils';
import {
  Bell,
  Calendar,
  Heart,
  Home,
  LogOut,
  MapPin,
  Menu,
  Music,
  Search,
  Settings,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface ResponsiveHeaderProps {
  className?: string;
}

export function ResponsiveHeader({ className }: ResponsiveHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Handle swipe gestures for mobile menu
  useEffect(() => {
    if (!isMobileMenuOpen || !mobileMenuRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].screenX;
      handleSwipeGesture();
    };

    const handleSwipeGesture = () => {
      const swipeThreshold = 50; // Minimum distance for swipe
      const swipeDistance = touchStartX.current - touchEndX.current;

      // Swipe left to close (for right-side menu)
      if (swipeDistance > swipeThreshold) {
        setIsMobileMenuOpen(false);
      }
    };

    const menuElement = mobileMenuRef.current;
    menuElement.addEventListener('touchstart', handleTouchStart);
    menuElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      menuElement.removeEventListener('touchstart', handleTouchStart);
      menuElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobileMenuOpen]);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Artists', href: '/artists', icon: Music },
    { name: 'Shows', href: '/shows', icon: Calendar },
    { name: 'Venues', href: '/venues', icon: MapPin },
    { name: 'Trending', href: '/trending', icon: TrendingUp },
  ];

  // Add My Artists link for authenticated users
  const authenticatedNavigation = user
    ? [
        ...navigation.slice(0, 2),
        { name: 'My Artists', href: '/my-artists', icon: Heart },
        ...navigation.slice(2),
      ]
    : navigation;

  const isActivePath = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) return [];

    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.suggestions || [];
      }
    } catch (error) {
      console.error('Search failed:', error);
    }

    return [];
  };

  const handleSearchSelect = (result: {
    type: 'artist' | 'show' | 'venue' | 'song';
    id: string;
  }) => {
    switch (result.type) {
      case 'artist':
        router.push(`/artists/${result.id}`);
        break;
      case 'show':
        router.push(`/shows/${result.id}`);
        break;
      case 'venue':
        router.push(`/venues/${result.id}`);
        break;
      default:
        router.push(`/search?q=${encodeURIComponent(result.title)}`);
    }
    setIsSearchOpen(false);
  };

  const handleSearchSubmit = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsSearchOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">MySetlist</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-6 lg:flex">
            {authenticatedNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-1 font-medium text-sm transition-colors hover:text-primary',
                    isActivePath(item.href)
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Search */}
          <div className="mx-6 hidden max-w-md flex-1 md:flex">
            <SearchBox
              placeholder="Search artists, shows, venues..."
              onSearch={handleSearch}
              onSelect={handleSearchSelect}
              onSubmit={handleSearchSubmit}
              className="w-full"
            />
          </div>

          {/* User Menu & Mobile Controls */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <ThemeToggle size="sm" className="hidden sm:flex" />

            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[36px] min-w-[36px] md:hidden"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Toggle search"
            >
              <Search className="h-5 w-5" />
            </Button>

            {user ? (
              <>
                {/* Notifications (when implemented) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative hidden min-h-[36px] min-w-[36px] sm:flex"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {/* Notification badge */}
                  <Badge className="-top-1 -right-1 absolute h-5 w-5 rounded-full p-0 text-xs">
                    3
                  </Badge>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.user_metadata?.avatar_url}
                          alt={user.email || ''}
                        />
                        <AvatarFallback>
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">
                          {user.user_metadata?.full_name || 'User'}
                        </p>
                        <p className="w-[200px] truncate text-muted-foreground text-sm">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile/following"
                        className="cursor-pointer"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        Following
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden items-center space-x-2 sm:flex">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/sign-up">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[36px] min-w-[36px] lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="border-t py-4 md:hidden">
            <SearchBox
              placeholder="Search artists, shows, venues..."
              onSearch={handleSearch}
              onSelect={handleSearchSelect}
              onSubmit={handleSearchSubmit}
              autoFocus
              className="w-full"
            />
          </div>
        )}

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="border-t bg-background lg:hidden"
            id="mobile-menu"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="space-y-2 px-4 py-4">
              {authenticatedNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg px-3 py-3 font-medium text-sm transition-colors',
                      'min-h-[44px] touch-manipulation', // iOS touch target
                      isActivePath(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Mobile Theme Toggle */}
              <div className="flex items-center space-x-3 px-3 py-3">
                <div className="flex h-5 w-5 items-center justify-center">
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <ThemeToggle variant="text" className="flex-1 justify-start" />
              </div>

              {!user && (
                <div className="space-y-2 border-border/50 border-t pt-4">
                  <Link
                    href="/auth/sign-in"
                    className="flex min-h-[44px] touch-manipulation items-center space-x-3 rounded-lg px-3 py-3 font-medium text-muted-foreground text-sm hover:bg-muted hover:text-foreground active:bg-muted/80"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="flex min-h-[44px] touch-manipulation items-center space-x-3 rounded-lg bg-primary px-3 py-3 font-medium text-primary-foreground text-sm hover:bg-primary/90 active:bg-primary/80"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
