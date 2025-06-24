'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@repo/design-system/lib/utils';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { 
  Home, 
  Search, 
  Calendar, 
  Users, 
  MapPin, 
  TrendingUp, 
  User,
  Music
} from 'lucide-react';
import { useAuth } from '@/app/providers/auth-provider';

const MAIN_NAV_ITEMS = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
    description: 'Main dashboard',
    requiresAuth: false
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: TrendingUp,
    description: 'Your personalized dashboard',
    requiresAuth: true
  },
  {
    title: 'Discover',
    href: '/discover',
    icon: Calendar,
    description: 'Find upcoming shows',
    requiresAuth: false
  },
  {
    title: 'Artists',
    href: '/artists',
    icon: Users,
    description: 'Browse and follow artists',
    requiresAuth: false
  },
  {
    title: 'Venues',
    href: '/venues',
    icon: MapPin,
    description: 'Explore concert venues',
    requiresAuth: false
  },
  {
    title: 'Search',
    href: '/search',
    icon: Search,
    description: 'Search everything',
    requiresAuth: false
  }
];

const USER_NAV_ITEMS = [
  {
    title: 'Profile',
    href: '/profile',
    icon: User,
    description: 'Your profile and stats',
    requiresAuth: true
  }
];

interface MainNavProps {
  className?: string;
  mobile?: boolean;
}

export function MainNav({ className, mobile = false }: MainNavProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const visibleNavItems = MAIN_NAV_ITEMS.filter(item => 
    !item.requiresAuth || user
  );

  const visibleUserItems = USER_NAV_ITEMS.filter(item => 
    !item.requiresAuth || user
  );

  if (loading) {
    return (
      <nav className={cn("flex items-center space-x-1", className)}>
        <div className="h-9 w-16 bg-muted animate-pulse rounded" />
        <div className="h-9 w-20 bg-muted animate-pulse rounded" />
        <div className="h-9 w-18 bg-muted animate-pulse rounded" />
      </nav>
    );
  }

  if (mobile) {
    return (
      <nav className={cn("flex flex-col space-y-1", className)}>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
              {isActive(item.href) && (
                <Badge variant="secondary" className="ml-auto">
                  Active
                </Badge>
              )}
            </Link>
          );
        })}
        
        {user && visibleUserItems.length > 0 && (
          <>
            <div className="border-t my-2" />
            {visibleUserItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {isActive(item.href) && (
                    <Badge variant="secondary" className="ml-auto">
                      Active
                    </Badge>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    );
  }

  return (
    <nav className={cn("flex items-center space-x-1", className)}>
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.href}
            asChild
            variant={isActive(item.href) ? "default" : "ghost"}
            size="sm"
            className={cn(
              "transition-colors",
              isActive(item.href) && "pointer-events-none"
            )}
          >
            <Link href={item.href} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.title}</span>
            </Link>
          </Button>
        );
      })}
      
      {user && (
        <div className="hidden md:flex items-center space-x-1 ml-4 pl-4 border-l">
          {visibleUserItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive(item.href) ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "transition-colors",
                  isActive(item.href) && "pointer-events-none"
                )}
              >
                <Link href={item.href} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.title}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </nav>
  );
} 