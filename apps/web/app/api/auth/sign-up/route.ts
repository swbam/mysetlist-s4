import {
  authRateLimitMiddleware,
  signUpRateLimiter,
} from '@/lib/auth-rate-limit';
import { validateCSRFToken } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await authRateLimitMiddleware(
      request,
      signUpRateLimiter
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
    const validationResult = signUpSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Create account with Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
      },
    });

    if (error) {
      // Log failed attempt
      console.warn('Failed sign-up attempt:', {
        email,
        error: error.message,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log successful sign-up
    console.info('Successful sign-up:', {
      userId: data.user?.id,
      email: data.user?.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      user: data.user,
      session: data.session,
      message: 'Please check your email to verify your account',
    });
  } catch (error) {
    console.error('Sign-up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
