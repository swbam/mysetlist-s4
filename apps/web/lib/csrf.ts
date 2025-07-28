import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

const CSRF_COOKIE_NAME = "csrf-token"
const CSRF_HEADER_NAME = "x-csrf-token"
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a CSRF token using Web Crypto API (Edge Runtime compatible)
 */
export function generateCSRFToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    // Use Web Crypto API for Edge Runtime
    const array = new Uint8Array(CSRF_TOKEN_LENGTH)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    )
  }

  // Fallback for environments without crypto
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

/**
 * Get or create CSRF token for the current session
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies()
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)

  if (existingToken?.value) {
    return existingToken.value
  }

  const newToken = generateCSRFToken()
  cookieStore.set(CSRF_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return newToken
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(
  request: NextRequest
): Promise<boolean> {
  // Skip CSRF validation for GET requests
  if (request.method === "GET") {
    return true
  }

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value

  if (!cookieToken) {
    return false
  }

  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (headerToken && headerToken === cookieToken) {
    return true
  }

  // Check body for form submissions
  try {
    const contentType = request.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      const body = await request.clone().json()
      return body.csrfToken === cookieToken
    }
  } catch {
    // Body parsing failed, continue to check other methods
  }

  return false
}

/**
 * CSRF protection middleware for API routes
 */
export async function csrfProtection(
  request: NextRequest
): Promise<Response | null> {
  // Skip CSRF for public endpoints
  const publicEndpoints = ["/api/health", "/api/search", "/api/trending"]

  // Skip CSRF for sync/integration endpoints in development
  const internalEndpoints = [
    "/api/sync",
    "/api/artists/auto-import",
    "/api/artists/sync",
    "/api/cron",
    "/api/webhooks",
  ]

  const pathname = request.nextUrl.pathname
  if (publicEndpoints.some((endpoint) => pathname.startsWith(endpoint))) {
    return null
  }

  // In development, skip CSRF for internal endpoints
  if (
    process.env["NODE_ENV"] === "development" &&
    internalEndpoints.some((endpoint) => pathname.startsWith(endpoint))
  ) {
    return null
  }

  const isValid = await validateCSRFToken(request)
  if (!isValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return null
}

/**
 * Hook to get CSRF token on client side
 */
export function useCSRFToken(): {
  csrfToken: string | null
  refreshToken: () => Promise<void>
} {
  if (typeof window === "undefined") {
    return { csrfToken: null, refreshToken: async () => {} }
  }

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null
    }
    return null
  }

  const refreshToken = async () => {
    try {
      const response = await fetch("/api/csrf-token")
      if (response.ok) {
        const data = await response.json()
        return data.token
      }
    } catch (_error) {}
  }

  return {
    csrfToken: getCookie(CSRF_COOKIE_NAME),
    refreshToken,
  }
}
