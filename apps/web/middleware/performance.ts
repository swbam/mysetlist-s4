import { type NextRequest, NextResponse } from "next/server";
import { getCacheHeaders } from "~/lib/performance/cache-config";

// Performance optimization middleware
export function performanceMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // Add performance headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Add caching headers based on route type
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/static/")
  ) {
    // Static assets - cache forever
    Object.entries(getCacheHeaders("static")).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } else if (pathname.startsWith("/api/")) {
    // API routes - cache with revalidation
    Object.entries(getCacheHeaders("api")).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add CORS headers for API routes
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.NEXT_PUBLIC_APP_URL || "*",
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  } else {
    // HTML pages - no cache
    Object.entries(getCacheHeaders("public")).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Add performance timing headers
  response.headers.set(
    "Server-Timing",
    `region;desc="iad1", environment;desc="production"`,
  );
  response.headers.set(
    "X-Vercel-Cache",
    request.headers.get("x-vercel-cache") || "MISS",
  );

  // Enable HTTP/2 Server Push for critical resources
  if (pathname === "/" || pathname.startsWith("/artists/")) {
    response.headers.append(
      "Link",
      "</fonts/inter-var.woff2>; rel=preload; as=font; crossorigin",
    );
    response.headers.append(
      "Link",
      "/_next/static/css/app.css>; rel=preload; as=style",
    );
  }

  return response;
}

// Compression settings for better performance
export const compressionConfig = {
  // Enable Brotli compression for text assets
  brotli: {
    enabled: true,
    quality: 4, // Balance between compression ratio and speed
  },
  // Gzip fallback
  gzip: {
    enabled: true,
    level: 6,
  },
  // Minimum size to compress (in bytes)
  threshold: 1024, // 1KB
  // Content types to compress
  types: [
    "text/html",
    "text/css",
    "text/plain",
    "text/xml",
    "text/javascript",
    "application/javascript",
    "application/json",
    "application/xml",
    "application/rss+xml",
    "image/svg+xml",
  ],
};
