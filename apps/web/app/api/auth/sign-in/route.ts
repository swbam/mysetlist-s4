import {
  authRateLimitMiddleware,
  signInRateLimiter,
} from '@/lib/auth-rate-limit';
import { validateCSRFToken } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await authRateLimitMiddleware(
      request,
      signInRateLimiter
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
    const validationResult = signInSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validationResult.data;

    // Sign in with Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log failed attempt for security monitoring
      console.warn('Failed sign-in attempt:', {
        email,
        error: error.message,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Log successful sign-in
    console.info('Successful sign-in:', {
      userId: data.user?.id,
      email: data.user?.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
