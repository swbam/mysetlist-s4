"use client";

import { useCallback, useEffect, useState } from "react";

export function useCSRFToken() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get CSRF token from cookie
  const getTokenFromCookie = useCallback((): string | null => {
    if (typeof window === "undefined") return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrf-token=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  }, []);

  // Fetch new CSRF token from API
  const refreshToken = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/csrf-token");
      if (response.ok) {
        const data = await response.json();
        const newToken = data.token;
        setCSRFToken(newToken);
        return newToken;
      }
    } catch (error) {
      console.error("Failed to refresh CSRF token:", error);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  // Load token on mount
  useEffect(() => {
    const token = getTokenFromCookie();
    if (token) {
      setCSRFToken(token);
    } else {
      refreshToken();
    }
  }, [getTokenFromCookie, refreshToken]);

  // Helper to add CSRF token to fetch requests
  const fetchWithCSRF = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = csrfToken || (await refreshToken());

      if (!token) {
        throw new Error("Failed to get CSRF token");
      }

      const headers = new Headers(options.headers);
      headers.set("x-csrf-token", token);

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [csrfToken, refreshToken],
  );

  return {
    csrfToken,
    loading,
    refreshToken,
    fetchWithCSRF,
  };
}
