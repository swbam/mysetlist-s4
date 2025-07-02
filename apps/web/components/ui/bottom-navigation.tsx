'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/design-system/lib/utils';
import { 
  Home, 
  Music, 
  Calendar, 
  MapPin, 
  TrendingUp,
  User,
  Search
} from 'lucide-react';

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
  items = defaultItems 
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
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background/95 backdrop-blur-sm border-t border-border',
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
                'px-3 py-2 rounded-lg transition-all duration-200',
                'touch-manipulation min-h-[48px] min-w-[48px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                'active:scale-95',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center"
                    aria-label={`${item.badge} notifications`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              
              <span 
                className={cn(
                  'text-xs font-medium mt-1 transition-all duration-200',
                  isActive ? 'opacity-100 scale-105' : 'opacity-70'
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
  className 
}: WithBottomNavigationProps) {
  return (
    <div className={cn('pb-20 md:pb-0', className)}>
      {children}
    </div>
  );
}