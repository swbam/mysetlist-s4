import { type NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware } from '~/middleware/rate-limit';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(request, res);

  const { data: { session } } = await supabase.auth.getSession();

  const protectedPaths = ['/dashboard', '/vote', '/profile', '/api/user'];

  if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path)) && !session) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  const { pathname } = request.nextUrl;

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await rateLimitMiddleware(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
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
    // Match all API routes
    '/api/:path*',
    // Skip static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
