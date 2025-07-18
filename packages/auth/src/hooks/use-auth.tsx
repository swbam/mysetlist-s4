'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AUTH_CONFIG } from '../config/supabase';
import { SupabaseAuthProvider } from '../providers/supabase';
import type { AuthSession, AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signInWithEmail: (email: string, password: string) => Promise<AuthUser>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ) => Promise<AuthUser>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ) => Promise<AuthUser>;
  signInWithSpotify: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (metadata: Record<string, any>) => Promise<AuthUser>;
  updatePreferences: (preferences: any) => Promise<void>;
  linkSpotify: () => Promise<void>;
  refreshSpotifyTokens: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: 'user' | 'moderator' | 'admin') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialSession?: AuthSession | null;
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(
    initialSession?.user || null
  );
  const [session, setSession] = useState<AuthSession | null>(
    initialSession || null
  );
  const [loading, setLoading] = useState(!initialSession);

  const authProvider = new SupabaseAuthProvider();

  // Initialize session and set up auth state listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session if not provided
        if (!initialSession) {
          const currentSession = await authProvider.getSession();
          setSession(currentSession);
          setUser(currentSession?.user || null);
        }
      } catch (_error) {
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = authProvider.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);

      // Handle navigation based on auth state
      if (event === 'SIGNED_IN' && session) {
        router.push(AUTH_CONFIG.redirectUrls.signIn);
      } else if (event === 'SIGNED_OUT') {
        router.push(AUTH_CONFIG.redirectUrls.signOut);
      }

      // Refresh the page to update server state
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [initialSession, router]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const user = await authProvider.signIn(email, password);
      return user;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      return signIn(email, password);
    },
    [signIn]
  );

  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, any>) => {
      setLoading(true);
      try {
        const user = await authProvider.signUp(email, password, metadata);
        return user;
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, metadata?: Record<string, any>) => {
      return signUp(email, password, metadata);
    },
    [signUp]
  );

  const signInWithSpotify = useCallback(async () => {
    setLoading(true);
    try {
      await authProvider.signInWithOAuth('spotify');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await authProvider.signInWithOAuth('google');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    await authProvider.signInWithMagicLink(email);
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await authProvider.signOut();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const newSession = await authProvider.refreshSession();
      setSession(newSession);
      setUser(newSession?.user || null);
    } catch (_error) {
      setSession(null);
      setUser(null);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await authProvider.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    await authProvider.updatePassword(password);
  }, []);

  const updateProfile = useCallback(async (metadata: Record<string, any>) => {
    const updatedUser = await authProvider.updateProfile(metadata);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const isAuthenticated = !!user && !!session;

  const updatePreferences = useCallback(async (preferences: any) => {
    // TODO: Implement preferences update logic
    console.log('Updating preferences:', preferences);
  }, []);

  const linkSpotify = useCallback(async () => {
    // TODO: Implement Spotify linking logic
    console.log('Linking Spotify account');
  }, []);

  const refreshSpotifyTokens = useCallback(async () => {
    // TODO: Implement Spotify token refresh logic
    console.log('Refreshing Spotify tokens');
  }, []);

  const hasRole = useCallback(
    (requiredRole: 'user' | 'moderator' | 'admin') => {
      if (!user) {
        return false;
      }

      const userRole = user.appMetadata?.['role'] || 'user';
      const roleHierarchy = { user: 0, moderator: 1, admin: 2 };

      return (
        roleHierarchy[userRole as keyof typeof roleHierarchy] >=
        roleHierarchy[requiredRole]
      );
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signInWithEmail,
    signUp,
    signUpWithEmail,
    signInWithSpotify,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    refreshSession,
    resetPassword,
    updatePassword,
    updateProfile,
    updatePreferences,
    linkSpotify,
    refreshSpotifyTokens,
    isAuthenticated,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
