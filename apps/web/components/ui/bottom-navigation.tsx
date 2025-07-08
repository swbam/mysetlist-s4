'use client';

import { cn } from '@repo/design-system/lib/utils';
import { Calendar, Home, Music, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isActive?: boolean;
}

interface BottomNavigationProps {
  className?: string;
  items?: NavigationItem[];
}

const defaultItems: NavigationItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Artists', href: '/artists', icon: Music },
  { name: 'Shows', href: '/shows', icon: Calendar },
  { name: 'Profile', href: '/profile', icon: User },
];

export function BottomNavigation({
  className,
  items = defaultItems,
}: BottomNavigationProps) {
  const pathname = usePathname();

  const isActivePath = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        'fixed right-0 bottom-0 left-0 z-50',
        'border-border border-t bg-background/95 backdrop-blur-sm',
        'safe-area-inset-bottom', // Handle device notches
        'md:hidden', // Only show on mobile
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center',
                'rounded-lg px-3 py-2 transition-all duration-200',
                'min-h-[48px] min-w-[48px] touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                'active:scale-95',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-all duration-200',
                    isActive && 'scale-110'
                  )}
                />

                {/* Badge indicator */}
                {item.badge && item.badge > 0 && (
                  <span
                    className="-top-1 -right-1 absolute flex h-4 w-4 items-center justify-center rounded-full bg-destructive font-medium text-destructive-foreground text-xs"
                    aria-label={`${item.badge} notifications`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  'mt-1 font-medium text-xs transition-all duration-200',
                  isActive ? 'scale-105 opacity-100' : 'opacity-70'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Hook to provide padding for bottom navigation
export function useBottomNavigationPadding() {
  return 'pb-20 md:pb-0'; // Add padding on mobile to account for bottom nav
}

// Higher-order component to wrap content with bottom navigation padding
interface WithBottomNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export function WithBottomNavigation({
  children,
  className,
}: WithBottomNavigationProps) {
  return <div className={cn('pb-20 md:pb-0', className)}>{children}</div>;
}
