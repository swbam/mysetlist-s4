import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Minimal middleware for testing
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
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
     * - api routes (let them handle their own middleware)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};