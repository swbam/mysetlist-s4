import { createSupabaseAdmin } from '../config/supabase';
import type { AuthUser } from '../types';

// Server-side authentication helpers
export async function getServerSession() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  const accessToken = cookieStore.get('supabase-access-token')?.value;
  const refreshToken = cookieStore.get('supabase-refresh-token')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const supabase = createSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    return {
      user: mapSupabaseUser(user),
      accessToken,
      refreshToken,
    };
  } catch (_error) {
    return null;
  }
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireRole(
  requiredRole: 'user' | 'moderator' | 'admin'
) {
  const session = await requireAuth();
  const userRole = session.user.appMetadata?.role || 'user';

  if (!hasRole(userRole, requiredRole)) {
    throw new Error('Insufficient permissions');
  }

  return session;
}

export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = { user: 0, moderator: 1, admin: 2 };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? 0;
  const requiredLevel =
    roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 0;

  return userLevel >= requiredLevel;
}

export function mapSupabaseUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: !!user.email_confirmed_at,
    lastSignIn: user.last_sign_in_at,
    metadata: user.user_metadata || {},
    appMetadata: user.app_metadata || {},
  };
}

// Client-side helpers
export function getRedirectUrl(path = '/'): string {
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

  return `${baseUrl}${path}`;
}

export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isPasswordStrong(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export function generateSecurePassword(length = 12): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
  let password = '';

  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // number
  password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // special char

  // Fill remaining length with random characters
  for (let i = 4; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

// Error handling
export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function handleAuthError(error: any): AuthError {
  if (error instanceof AuthError) {
    return error;
  }

  // Map common Supabase errors to friendly messages
  const errorMappings: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed':
      'Please check your email and click the confirmation link.',
    'Signup not allowed for this instance':
      'Account registration is currently disabled.',
    'Password should be at least 6 characters':
      'Password must be at least 6 characters long.',
    'User already exists': 'An account with this email already exists.',
    'Token has expired or is invalid':
      'Your session has expired. Please sign in again.',
  };

  const message =
    errorMappings[error.message] ||
    error.message ||
    'An unexpected error occurred';

  return new AuthError(message, error.code, error.statusCode);
}
