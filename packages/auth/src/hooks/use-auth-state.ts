"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../client";
import { UnifiedAuthProvider } from "../providers/unified-auth";
import type { AuthSession, AuthUser } from "../types/auth";

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const authProvider = new UnifiedAuthProvider();

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const currentSession = await authProvider.getCurrentSession();

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to get session",
          );
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, _supabaseSession) => {
      if (!mounted) return;

      try {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const enrichedSession = await authProvider.getCurrentSession();
          setSession(enrichedSession);
          setUser(enrichedSession?.user || null);
          setError(null);
        } else if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setError(null);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Auth state change error",
        );
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshSession = async () => {
    try {
      setLoading(true);
      const currentSession = await authProvider.getCurrentSession();
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh session",
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    error,
    refreshSession,
    isAuthenticated: !!user,
    isEmailVerified: !!user?.emailVerified,
    isSpotifyConnected: !!user?.spotifyConnected,
  };
}
