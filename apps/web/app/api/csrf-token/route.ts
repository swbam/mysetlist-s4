import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * CSRF Token Generation API
 * Generates secure CSRF tokens for form submissions and API calls
 * Tokens are bound to user sessions and have expiration times
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting - more lenient for CSRF token requests
  const rateLimitResult = await rateLimitMiddleware(request, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Get user session to bind token to user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // CSRF tokens can be generated for both authenticated and anonymous users
    // Anonymous users get session-based tokens, authenticated users get user-bound tokens
    const userId = user?.id || "anonymous";
    const sessionId =
      request.headers.get("x-session-id") || randomBytes(16).toString("hex");

    // Generate secure random token
    const tokenBytes = randomBytes(32);
    const token = tokenBytes.toString("base64url");

    // Create token hash for server-side validation
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const timestamp = new Date().toISOString();

    // Create token payload for validation
    const payload = {
      userId,
      sessionId,
      tokenHash,
      timestamp,
      expiresAt: expiresAt.toISOString(),
      userAgent: request.headers.get("user-agent") || "",
      origin:
        request.headers.get("origin") || request.headers.get("referer") || "",
    };

    // Set CSRF token in httpOnly cookie for additional security
    const cookieStore = await cookies();
    cookieStore.set("csrf-token", token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    // Also set token hash in a separate cookie for client-side validation
    cookieStore.set("csrf-token-hash", tokenHash, {
      httpOnly: false,
      secure: process.env['NODE_ENV'] === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    // Store token metadata in session storage if user is authenticated
    if (user) {
      try {
        // Store in user metadata or session table
        const { error: storageError } = await supabase
          .from("user_sessions")
          .upsert(
            {
              userId: user.id,
              session_id: sessionId,
              csrf_token_hash: tokenHash,
              expires_at: expiresAt.toISOString(),
              user_agent: payload.userAgent,
              origin: payload.origin,
              _creationTime: timestamp,
            },
            {
              onConflict: "userId,session_id",
            },
          );

        if (storageError) {
          console.warn("Failed to store CSRF token metadata:", storageError);
          // Continue anyway - token is still valid via cookies
        }
      } catch (error) {
        console.warn("CSRF token storage error:", error);
        // Continue anyway - token is still valid via cookies
      }
    }

    const response = NextResponse.json({
      token,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      timestamp,
      sessionId,
      authenticated: !!user,
      instructions: {
        usage: "Include this token in POST/PUT/DELETE requests",
        header: "X-CSRF-Token",
        cookie: "csrf-token (automatically set)",
        expiration: "1 hour from generation",
      },
    });

    // Security headers
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");

    return response;
  } catch (error) {
    console.error("CSRF token generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate CSRF token",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint for CSRF token validation
 * Used by server-side middleware to validate tokens
 */
export async function POST(request: NextRequest) {
  // Apply stricter rate limiting for validation requests
  const rateLimitResult = await rateLimitMiddleware(request, {
    maxRequests: 100,
    windowSeconds: 60,
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const token = body.token || request.headers.get("x-csrf-token");

    if (!token) {
      return NextResponse.json(
        { error: "CSRF token required", valid: false },
        { status: 400 },
      );
    }

    // Get stored token from cookies
    const cookieStore = await cookies();
    const storedToken = cookieStore.get("csrf-token")?.value;
    const storedHash = cookieStore.get("csrf-token-hash")?.value;

    if (!storedToken || !storedHash) {
      return NextResponse.json(
        { error: "No CSRF token found in session", valid: false },
        { status: 400 },
      );
    }

    // Validate token
    const providedHash = createHash("sha256").update(token).digest("hex");
    const tokensMatch = storedToken === token && storedHash === providedHash;

    // Additional validation for authenticated users
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let sessionValid = true;
    if (user) {
      try {
        const { data: session } = await supabase
          .from("user_sessions")
          .select("expires_at, csrf_token_hash")
          .eq("userId", user.id)
          .eq("csrf_token_hash", providedHash)
          .single();

        if (session) {
          const expiresAt = new Date(session.expires_at);
          sessionValid =
            expiresAt > new Date() && session.csrf_token_hash === providedHash;
        }
      } catch (error) {
        console.warn("Session validation error:", error);
        // Fall back to cookie-only validation
      }
    }

    const isValid = tokensMatch && sessionValid;

    return NextResponse.json({
      valid: isValid,
      authenticated: !!user,
      timestamp: new Date().toISOString(),
      ...(isValid ? {} : { error: "Invalid CSRF token" }),
    });
  } catch (error) {
    console.error("CSRF token validation error:", error);
    return NextResponse.json(
      {
        error: "Failed to validate CSRF token",
        valid: false,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
      },
    },
  );
}
