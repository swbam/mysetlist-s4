import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Standardized authentication for API routes
 * Supports multiple token types for different use cases
 */
export async function validateApiAuth(): Promise<{
  isValid: boolean;
  authHeader?: string;
  error?: NextResponse;
}> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    const validTokens = [
      process.env.CRON_SECRET,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.ADMIN_API_KEY,
    ].filter(Boolean) as string[];

    if (validTokens.length === 0) {
      // If no tokens configured, allow access (development mode)
      return { isValid: true };
    }

    if (!authHeader) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Authorization header required" },
          { status: 401 },
        ),
      };
    }

    const isValidToken = validTokens.some(
      (token) => authHeader === `Bearer ${token}`,
    );

    if (!isValidToken) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Invalid authorization token" },
          { status: 401 },
        ),
      };
    }

    return { isValid: true, authHeader };
  } catch (error) {
    return {
      isValid: false,
      error: NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 },
      ),
    };
  }
}

/**
 * Simplified auth check for cron jobs
 * Returns the auth header if valid, or throws an error response
 */
export async function requireCronAuth(): Promise<string | null> {
  const authResult = await validateApiAuth();

  if (!authResult.isValid) {
    throw authResult.error;
  }

  return authResult.authHeader || null;
}

/**
 * Standard error response format for API routes
 */
export function createErrorResponse(
  message: string,
  statusCode = 500,
  details?: any,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    },
    { status: statusCode },
  );
}

/**
 * Standard success response format for API routes
 */
export function createSuccessResponse(
  data: any,
  message?: string,
): NextResponse {
  return NextResponse.json({
    success: true,
    ...(message && { message }),
    ...data,
    timestamp: new Date().toISOString(),
  });
}
