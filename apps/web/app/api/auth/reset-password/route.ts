import {
  authRateLimitMiddleware,
  passwordResetRateLimiter,
} from '@/lib/auth-rate-limit';
import { validateCSRFToken } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await authRateLimitMiddleware(
      request,
      passwordResetRateLimiter
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate CSRF token
    const isValidCSRF = await validateCSRFToken(request);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Send password reset email
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.nextUrl.origin}/auth/callback?next=/auth/update-password`,
    });

    // Always return success to prevent email enumeration
    // Even if the email doesn't exist in our system
    console.info('Password reset requested:', {
      email,
      success: !error,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message:
        'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
