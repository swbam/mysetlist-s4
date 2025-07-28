"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "../types";
import { useAuth } from "./use-auth";

export function useUser() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated || !user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch user profile from your API
        const response = await fetch("/api/user/profile", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const userProfile = await response.json();
        setProfile(userProfile);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load user profile",
        );
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!isAuthenticated) {
      throw new Error("User must be authenticated to update profile");
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    isAuthenticated,
    user,
  };
}
