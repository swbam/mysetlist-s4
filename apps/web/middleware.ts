import { type NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware } from '~/middleware/rate-limit';
import { createServerClient } from '@supabase/ssr';
import { csrfProtection } from '~/lib/csrf';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  // Ensure environment variables are available
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  
  // Skip auth check if environment is not properly configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Missing Supabase environment variables');
    // Continue without auth check to prevent breaking the entire app
    return res;
  }
  
  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    const protectedPaths = [
      '/dashboard',
      '/vote',
      '/profile',
      '/api/user',
      '/admin',
      '/settings',
      '/my-artists',
      '/notifications',
      '/api/admin',
      '/api/votes',
      '/api/setlists',
    ];

    if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path)) && !session) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
  } catch (error) {
    console.error('[Middleware] Error in auth check:', error);
    // Continue without auth check to prevent breaking the entire app
  }

  const { pathname } = request.nextUrl;

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await rateLimitMiddleware(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Apply CSRF protection to API routes
    const csrfResponse = await csrfProtection(request);
    if (csrfResponse) {
      return csrfResponse;
    }
  }

  // Add security headers
  // const response = NextResponse.next(); // This line is removed as per the new_code

  // Security headers
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  res.headers.set('X-Request-ID', requestId);

  return res;
}

export const config = {
  matcher: [
    // Match all API routes except public ones
    '/api/((?!search|trending|health|artists/\[slug\]|shows/\[slug\]|venues/\[slug\]).*)',
    // Match protected routes
    '/dashboard/:path*',
    '/vote/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/settings/:path*',
    '/my-artists/:path*',
    '/notifications/:path*',
  ],
};
