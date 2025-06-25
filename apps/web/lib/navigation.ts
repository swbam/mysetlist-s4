/**
 * Navigation utilities and route helpers
 */

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  icon?: string;
  external?: boolean;
}

export interface NavigationSection {
  title: string;
  items: NavItem[];
}

// Main navigation items
export const mainNavigation: NavItem[] = [
  {
    title: 'Home',
    href: '/',
    description: 'Discover trending shows and artists',
  },
  {
    title: 'Search',
    href: '/search',
    description: 'Find artists, shows, and venues',
  },
  {
    title: 'Artists',
    href: '/artists',
    description: 'Browse music artists',
  },
  {
    title: 'Shows',
    href: '/shows',
    description: 'Upcoming and past concerts',
  },
  {
    title: 'Venues',
    href: '/venues',
    description: 'Concert venues and locations',
  },
  {
    title: 'Trending',
    href: '/trending',
    description: 'What\'s hot in live music',
  },
];

// User-specific navigation items (requires authentication)
export const userNavigation: NavItem[] = [
  {
    title: 'Profile',
    href: '/profile',
    description: 'Your profile and activity',
  },
  {
    title: 'Following',
    href: '/profile/following',
    description: 'Artists you follow',
  },
  {
    title: 'Playlists',
    href: '/playlists',
    description: 'Your saved setlists',
  },
  {
    title: 'Notifications',
    href: '/notifications',
    description: 'Updates and alerts',
  },
  {
    title: 'Settings',
    href: '/settings',
    description: 'Account preferences',
  },
];

// Footer navigation sections
export const footerNavigation: NavigationSection[] = [
  {
    title: 'Platform',
    items: [
      { title: 'About', href: '/about' },
      { title: 'How it Works', href: '/about#how-it-works' },
      { title: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Discover',
    items: [
      { title: 'Artists', href: '/artists' },
      { title: 'Shows', href: '/shows' },
      { title: 'Venues', href: '/venues' },
      { title: 'Trending', href: '/trending' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { title: 'Privacy Policy', href: '/privacy' },
      { title: 'Terms of Service', href: '/terms' },
    ],
  },
];

// Routes that require authentication
export const protectedRoutes = [
  '/profile',
  '/profile/following',
  '/profile/activity',
  '/profile/edit',
  '/playlists',
  '/notifications',
  '/settings',
  '/admin',
];

// Routes that should redirect authenticated users (auth pages)
export const authRoutes = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/reset-password',
];

/**
 * Check if a route requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if a route should redirect authenticated users
 */
export function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route => pathname.startsWith(route));
}

/**
 * Generate a breadcrumb trail from a pathname
 */
export function generateBreadcrumbs(pathname: string): Array<{ label: string; href?: string }> {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; href?: string }> = [];

  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Capitalize and format segment
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    breadcrumbs.push({
      label,
      href: i === segments.length - 1 ? undefined : currentPath, // No href for last item
    });
  }

  return breadcrumbs;
}

/**
 * Get the navigation section for mobile menu organization
 */
export function getNavigationSections(): NavigationSection[] {
  return [
    {
      title: 'Main',
      items: mainNavigation,
    },
    {
      title: 'Account',
      items: userNavigation,
    },
  ];
}

/**
 * Generate canonical URL for a page
 */
export function getCanonicalUrl(pathname: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://mysetlist.com';
  return new URL(pathname, base).href;
}

/**
 * Check if a link is external
 */
export function isExternalLink(href: string): boolean {
  return href.startsWith('http') && !href.includes(process.env.NEXT_PUBLIC_SITE_URL || 'mysetlist.com');
}