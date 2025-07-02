import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { keys } from '../../keys';
import type { AuthUser, AuthSession } from '../types';

const env = keys();

export async function createServerSession() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function getServerAuthSession(): Promise<{
  user: AuthUser | null;
  session: AuthSession | null;
} | null> {
  try {
    const supabase = await createServerSession();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { user: null, session: null };
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        emailVerified: !!session.user.email_confirmed_at,
        lastSignIn: session.user.last_sign_in_at,
        metadata: session.user.user_metadata || {},
        appMetadata: session.user.app_metadata || {},
      },
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
        user: {
          id: session.user.id,
          email: session.user.email,
          emailVerified: !!session.user.email_confirmed_at,
          lastSignIn: session.user.last_sign_in_at,
          metadata: session.user.user_metadata || {},
          appMetadata: session.user.app_metadata || {},
        },
      },
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return { user: null, session: null };
  }
}

export async function validateServerSession(): Promise<AuthUser | null> {
  const auth = await getServerAuthSession();
  return auth?.user || null;
}

export async function requireServerAuth(): Promise<AuthUser> {
  const user = await validateServerSession();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requireServerRole(requiredRole: 'user' | 'moderator' | 'admin'): Promise<AuthUser> {
  const user = await requireServerAuth();
  const userRole = user.appMetadata?.role || 'user';
  
  const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? 0;
  const requiredLevel = roleHierarchy[requiredRole] ?? 0;
  
  if (userLevel < requiredLevel) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}

// Session management utilities
export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() / 1000 >= expiresAt;
}

export function isSessionExpiringSoon(expiresAt: number, thresholdMinutes: number = 5): boolean {
  const threshold = thresholdMinutes * 60; // Convert to seconds
  const timeLeft = expiresAt - (Date.now() / 1000);
  return timeLeft <= threshold && timeLeft > 0;
}

export function getSessionTimeLeft(expiresAt: number): number {
  return Math.max(0, expiresAt - (Date.now() / 1000));
}

export function formatSessionTimeLeft(expiresAt: number): string {
  const timeLeft = getSessionTimeLeft(expiresAt);
  
  if (timeLeft <= 0) {
    return 'Expired';
  }
  
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}