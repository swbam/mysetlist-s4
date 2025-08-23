"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { createClient } from "~/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithSpotify: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient();

export const AuthProvider = React.memo(function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Check initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error);
        }

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    let subscription: any;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      });
      subscription = data.subscription;
    } catch (error) {
      console.error("Failed to setup auth listener:", error);
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signInWithEmail = async (
    email: string,
    password: string,
    _rememberMe = false,
  ) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "http://localhost:3001/auth/callback";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      throw error;
    }
  };

  const signInWithSpotify = async () => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/my-artists`
        : "http://localhost:3001/auth/callback?next=/my-artists";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo,
        scopes:
          "user-read-email user-read-private user-top-read user-follow-read",
      },
    });
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    router.push("/");
  };

  const resetPassword = async (email: string) => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/auth/update-password`
        : "http://localhost:3001/auth/callback?next=/auth/update-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  };

  const hasRole = (role: string) => {
    // Check user metadata for role
    const userRole =
      user?.app_metadata?.['role'] || user?.user_metadata?.['role'] || "user";
    return userRole === role;
  };

  const isAuthenticated = !!session && !!user;

  const contextValue = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated,
      signInWithEmail,
      signUpWithEmail,
      signInWithSpotify,
      signOut,
      resetPassword,
      updatePassword,
      hasRole,
    }),
    [user, session, loading, isAuthenticated],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
