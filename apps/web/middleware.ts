import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { applySecurityMiddleware } from './lib/security-middleware';
import { updateSession } from './middleware/auth';

// Protected routes that require authentication
const protectedRoutes = ['/my-artists', '/profile', '/settings', '/admin'];

// Helper function to check if a path requires authentication
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Cache control configurations for different route patterns
const cacheConfigs = {
  // Static assets - long cache
  static: {
    pattern: /^\/(images|fonts|icons|_next\/static)\/.*/,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
  // API routes - short cache with revalidation
  api: {
    pattern: /^\/api\/.*/,
    headers: {
      'Cache-Control':
        'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      'CDN-Cache-Control': 'max-age=600',
    },
  },
  // Dynamic pages - cache with revalidation
  dynamic: {
    pattern: /^\/(shows|artists|venues|setlists)\/.*/,
    headers: {
      'Cache-Control':
        'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      'CDN-Cache-Control': 'max-age=300',
    },
  },
  // Home and static pages - moderate cache
  pages: {
    pattern: /^\/($|about|contact|legal)/,
    headers: {
      'Cache-Control':
        'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'max-age=3600',
    },
  },
};

// Security headers that should be applied to all responses
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

// Performance headers
const performanceHeaders = {
  'X-Robots-Tag': 'index, follow',
  'X-Powered-By': 'MySetlist',
};

export async function middleware(request: NextRequest) {
  // Apply security middleware first
  const securityResponse = await applySecurityMiddleware(request);
  if (securityResponse) {
    return securityResponse;
  }

  // Update auth session
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Check authentication for protected routes
  if (isProtectedRoute(pathname)) {
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(pathname);
        const loginUrl = new URL(
          `/auth/sign-in?returnUrl=${returnUrl}`,
          request.url
        );
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply performance headers
  Object.entries(performanceHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply cache headers based on route pattern
  for (const config of Object.values(cacheConfigs)) {
    if (config.pattern.test(pathname)) {
      Object.entries(config.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      break;
    }
  }

  // Add Link preload headers for critical resources
  if (pathname === '/' || pathname === '') {
    const preloadHeaders = [
      '</fonts/inter-var.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous',
      '</_next/static/css/app.css>; rel=preload; as=style',
      '<https://yzwkimtdaabyjbpykquu.supabase.co>; rel=preconnect',
      '<https://i.scdn.co>; rel=preconnect',
    ];
    response.headers.set('Link', preloadHeaders.join(', '));
  }

  // Add early hints for faster page loads
  if (pathname.startsWith('/shows/') || pathname.startsWith('/artists/')) {
    response.headers.set('X-Accel-Buffering', 'no');
    response.headers.set('X-Vercel-Streaming', '1');
  }

  // Handle prefetch requests with appropriate cache headers
  if (request.headers.get('purpose') === 'prefetch') {
    response.headers.set('Cache-Control', 'private, max-age=3600');
  }

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
