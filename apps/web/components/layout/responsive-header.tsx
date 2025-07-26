'use client';

import { useAuth } from '~/app/providers/auth-provider';
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
import { ThemeToggle } from '~/components/ui/theme-provider';

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

  // Handle body scroll lock when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Handle click outside and escape key to close mobile menu
  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.changedTouches[0]) {
        touchStartX.current = e.changedTouches[0].screenX;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches[0]) {
        touchEndX.current = e.changedTouches[0].screenX;
        handleSwipeGesture();
      }
    };

    const handleSwipeGesture = () => {
      const swipeThreshold = 50; // Minimum distance for swipe
      const swipeDistance = touchStartX.current - touchEndX.current;

      // Swipe left to close (for right-side menu)
      if (swipeDistance > swipeThreshold) {
        setIsMobileMenuOpen(false);
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    if (mobileMenuRef.current) {
      const menuElement = mobileMenuRef.current;
      menuElement.addEventListener('touchstart', handleTouchStart);
      menuElement.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
        menuElement.removeEventListener('touchstart', handleTouchStart);
        menuElement.removeEventListener('touchend', handleTouchEnd);
      };
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
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
    if (query.length < 2) {
      return [];
    }

    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.suggestions || [];
      }
    } catch (_error) {}

    return [];
  };

  const handleSearchSelect = (result: any) => {
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
        router.push(`/search?q=${encodeURIComponent('')}`);
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
    } catch (_error) {}
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">MySetlist</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-4 lg:flex xl:space-x-6">
            {authenticatedNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 rounded-lg px-3 py-2 font-medium text-sm transition-all duration-200',
                    'hover:bg-muted/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isActivePath(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Search */}
          <div className="mx-4 hidden max-w-sm flex-1 lg:mx-6 lg:max-w-md xl:flex">
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
                          src={user.user_metadata?.['avatar_url']}
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
                          {user.user_metadata?.['full_name'] || 'User'}
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
              className="min-h-[44px] min-w-[44px] touch-manipulation lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
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
            className="absolute left-0 right-0 top-full z-50 border-t bg-background/95 backdrop-blur-md shadow-lg lg:hidden"
            id="mobile-menu"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="container mx-auto max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6">
              <div className="space-y-1">
                {authenticatedNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 rounded-xl px-4 py-4 font-medium text-base transition-all duration-200',
                        'min-h-[56px] touch-manipulation active:scale-[0.98]', // iOS touch target
                        isActivePath(item.href)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground hover:bg-muted/80 active:bg-muted'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span className="text-lg">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Theme Toggle */}
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-base">Theme</span>
                  <ThemeToggle />
                </div>
              </div>

              {/* Mobile Auth Section */}
              {!user && (
                <div className="mt-6 space-y-3 border-t pt-6">
                  <Link
                    href="/auth/sign-in"
                    className="flex min-h-[56px] touch-manipulation items-center justify-center rounded-xl border border-border bg-background px-6 py-4 font-medium text-foreground text-lg transition-all duration-200 hover:bg-muted active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="flex min-h-[56px] touch-manipulation items-center justify-center rounded-xl bg-primary px-6 py-4 font-medium text-primary-foreground text-lg shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* User Section for Authenticated Users */}
              {user && (
                <div className="mt-6 space-y-3 border-t pt-6">
                  <div className="flex items-center space-x-3 px-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user.user_metadata?.['avatar_url']}
                        alt={user.email || ''}
                      />
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base">
                        {user.user_metadata?.['full_name'] || 'User'}
                      </p>
                      <p className="text-muted-foreground text-sm truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  <Link
                    href="/profile"
                    className="flex min-h-[56px] touch-manipulation items-center space-x-3 rounded-xl px-4 py-4 font-medium text-base transition-all duration-200 hover:bg-muted active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-6 w-6" />
                    <span>Profile</span>
                  </Link>
                  
                  <Link
                    href="/settings"
                    className="flex min-h-[56px] touch-manipulation items-center space-x-3 rounded-xl px-4 py-4 font-medium text-base transition-all duration-200 hover:bg-muted active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="h-6 w-6" />
                    <span>Settings</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex min-h-[56px] w-full touch-manipulation items-center space-x-3 rounded-xl px-4 py-4 font-medium text-base text-destructive transition-all duration-200 hover:bg-destructive/10 active:scale-[0.98]"
                  >
                    <LogOut className="h-6 w-6" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
