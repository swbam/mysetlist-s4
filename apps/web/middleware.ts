import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { securityMiddleware } from "./middleware/security";
import { updateSession } from "./middleware/auth";

export async function middleware(request: NextRequest) {
  // Apply security first (headers, basic rate limit, CSRF)
  const securityResult = await securityMiddleware(request);
  if (securityResult instanceof NextResponse) {
    return securityResult;
  }

  // Ensure Supabase session cookies are refreshed for SSR
  return updateSession(request);
}

// Skip static assets and Next internals
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|ico)$).*)",
  ],
};