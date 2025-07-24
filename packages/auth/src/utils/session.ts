import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { keys } from '../../keys';
import type { AuthSession, AuthUser } from '../types';
import type { User } from '@supabase/supabase-js';

const env = keys();

// Helper function to map Supabase user to AuthUser
function mapSupabaseUserToAuthUser(user: User): AuthUser {
  return {
    ...user,
    profile: {
      id: '',
      userId: user.id,
      displayName: user.user_metadata?.['displayName'] || user.email?.split('@')[0] || '',
      isPublic: true,
      showAttendedShows: true,
      showVotedSongs: true,
      showsAttended: 0,
      songsVoted: 0,
      artistsFollowed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    preferences: {
      emailPreferences: {
        id: '',
        userId: user.id,
        emailEnabled: true,
        showReminders: true,
        showReminderFrequency: 'daily',
        newShowNotifications: true,
        newShowFrequency: 'daily',
        setlistUpdates: true,
        setlistUpdateFrequency: 'immediately',
        weeklyDigest: false,
        marketingEmails: false,
        securityEmails: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      privacySettings: {
        showProfile: true,
        showVotingHistory: true,
        showAttendanceHistory: true,
        allowFollowing: true,
        showOnlineStatus: false,
      },
      musicPreferences: {
        favoriteGenres: [],
        preferredVenues: [],
        notificationRadius: 50,
      },
    },
    emailVerified: !!user.email_confirmed_at,
    spotifyConnected: false,
  } as AuthUser;
}

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
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return { user: null, session: null };
    }

    const authUser = mapSupabaseUserToAuthUser(session.user);

    return {
      user: authUser,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0,
        user: authUser,
      } as AuthSession,
    };
  } catch (_error) {
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

export async function requireServerRole(
  requiredRole: 'user' | 'moderator' | 'admin'
): Promise<AuthUser> {
  const user = await requireServerAuth();
  const userRole = user.app_metadata?.['role'] || 'user';

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

export function isSessionExpiringSoon(
  expiresAt: number,
  thresholdMinutes = 5
): boolean {
  const threshold = thresholdMinutes * 60; // Convert to seconds
  const timeLeft = expiresAt - Date.now() / 1000;
  return timeLeft <= threshold && timeLeft > 0;
}

export function getSessionTimeLeft(expiresAt: number): number {
  return Math.max(0, expiresAt - Date.now() / 1000);
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
