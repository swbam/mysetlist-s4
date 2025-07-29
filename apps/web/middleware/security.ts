import { createRateLimiter } from "@repo/rate-limit";
import { type NextRequest, NextResponse } from "next/server";

// Security headers configuration
const securityHeaders = {
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.sentry-cdn.com https://browser.sentry-cdn.com https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' https:",
    "connect-src 'self' https: wss: ws:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),

  // HTTP Strict Transport Security
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Prevent clickjacking
  "X-Frame-Options": "DENY",

  // XSS Protection
  "X-XSS-Protection": "1; mode=block",

  // Referrer Policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions Policy
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "interest-cohort=()",
  ].join(", "),

  // Cross-Origin Policies
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

// Rate limiting configuration
const rateLimitConfig = {
  // API endpoints
  "/api/": { requests: 100, window: "15m" },
  "/api/auth/": { requests: 10, window: "15m" },
  "/api/votes": { requests: 50, window: "15m" },
  "/api/search": { requests: 200, window: "15m" },

  // Default rate limit
  default: { requests: 1000, window: "15m" },
};

// CSRF token validation
const validateCSRFToken = (request: NextRequest): boolean => {
  // Skip CSRF validation for GET requests and safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  const csrfToken = request.headers.get("x-csrf-token");
  const cookieToken = request.cookies.get("csrf-token")?.value;

  // For now, we'll implement a basic CSRF check
  // In production, you'd want a more robust implementation
  return csrfToken === cookieToken;
};

// IP-based rate limiting
const ipRateLimit = new Map<string, { count: number; resetTime: number }>();

const checkIPRateLimit = (
  ip: string,
  limit = 1000,
  windowMs: number = 15 * 60 * 1000,
): boolean => {
  const now = Date.now();
  const record = ipRateLimit.get(ip);

  if (!record || now > record.resetTime) {
    ipRateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
};

// Suspicious activity detection
const suspiciousPatterns = [
  /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection
  /<script|javascript:|vbscript:|onload=|onerror=/i, // XSS
  /\.\.\//g, // Path traversal
  /(cmd|exec|system|shell_exec)/i, // Command injection
];

const detectSuspiciousActivity = (request: NextRequest): boolean => {
  const url = request.url;
  const userAgent = request.headers.get("user-agent") || "";

  // Check URL for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  // Check for suspicious user agents
  const suspiciousUserAgents = [
    "sqlmap",
    "nikto",
    "nmap",
    "masscan",
    "nessus",
    "openvas",
    "w3af",
    "skipfish",
  ];

  return suspiciousUserAgents.some((agent) =>
    userAgent.toLowerCase().includes(agent),
  );
};

// Main security middleware
export async function securityMiddleware(
  request: NextRequest,
): Promise<NextResponse | null> {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Detect suspicious activity
  if (detectSuspiciousActivity(request)) {
    console.warn(
      `Suspicious activity detected from IP: ${ip}, URL: ${request.url}`,
    );
    return new NextResponse("Forbidden", { status: 403 });
  }

  // IP-based rate limiting for potential attacks
  if (!checkIPRateLimit(ip, 2000, 15 * 60 * 1000)) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": "900", // 15 minutes
      },
    });
  }

  // API-specific rate limiting
  if (pathname.startsWith("/api/")) {
    const rateLimitKey =
      Object.keys(rateLimitConfig).find(
        (key) => key !== "default" && pathname.startsWith(key),
      ) || "default";

    const config =
      rateLimitConfig[rateLimitKey as keyof typeof rateLimitConfig];

    const limiter = createRateLimiter({
      limit: config.requests,
      window: config.window,
      prefix: rateLimitKey,
    });

    const { success } = await limiter.limit(ip);

    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "900",
        },
      });
    }
  }

  // CSRF protection for state-changing requests
  if (pathname.startsWith("/api/") && !validateCSRFToken(request)) {
    return new NextResponse("CSRF token validation failed", { status: 403 });
  }

  // Add security-related headers for API responses
  if (pathname.startsWith("/api/")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

// CSRF token generation endpoint
export const generateCSRFToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// Security audit logging
export const logSecurityEvent = (event: {
  type: "auth_failure" | "rate_limit" | "suspicious_activity" | "csrf_failure";
  ip: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  details?: any;
}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: "security",
    ...event,
  };

  // In production, send to security monitoring service
  console.warn("Security Event:", logEntry);

  // You could also send to Sentry or other monitoring services
  // Sentry.captureMessage('Security Event', 'warning', { extra: logEntry });
};

// Data sanitization utilities
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/['"]/g, "") // Remove quotes
    .trim()
    .slice(0, 1000); // Limit length
};

export const sanitizeEmail = (email: string): string => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email.toLowerCase().trim() : "";
};

// Input validation schemas
export const validationSchemas = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9-]+$/,
  searchQuery: /^[a-zA-Z0-9\s\-_.,!?'"()]+$/,
};

export const validateInput = (
  input: string,
  schema: keyof typeof validationSchemas,
): boolean => {
  return validationSchemas[schema].test(input);
};
