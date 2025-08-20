"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../client";
import type { Session as AuthSession, User as AuthUser } from "@supabase/supabase-js";

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data.session as AuthSession | null;

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
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
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      if (newSession?.session) {
        setSession(newSession.session as AuthSession);
        setUser(newSession.session?.user ?? null);
      } else {
        setSession(null);
        setUser(null);
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
      const { data } = await supabase.auth.getSession();
      setSession(data.session as AuthSession | null);
      setUser(data.session?.user ?? null);
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
