import { type NextRequest, NextResponse } from "next/server";

/**
 * Simplified session update for Edge Runtime compatibility
 * Actual Supabase auth verification happens in server components/API routes
 */
export async function updateSession(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Check for auth-related paths that need protection
    const pathname = request.nextUrl.pathname;
    const protectedPaths = ['/profile', '/admin', '/my-artists', '/settings'];
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
    
    if (isProtectedPath) {
      // Check for Supabase auth cookies (Edge-compatible check)
      const cookies = request.cookies.getAll();
      const hasAuthToken = cookies.some(cookie => 
        cookie.name.startsWith('sb-') && 
        (cookie.name.includes('auth-token') || 
         cookie.name.includes('access-token') ||
         cookie.name.includes('access_token'))
      );
      
      if (!hasAuthToken) {
        const signInUrl = new URL('/auth/sign-in', request.url);
        signInUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(signInUrl);
      }
    }

    // For auth callback, ensure cookies are properly forwarded
    if (pathname === '/auth/callback') {
      const cookiesToForward = request.cookies.getAll();
      cookiesToForward.forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value);
      });
    }

    return response;
  } catch (_error) {
    // Return a basic response on error
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}
