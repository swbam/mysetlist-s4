'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';

export function useSession() {
  const { session, refreshSession, loading: authLoading } = useAuth();
  const [isExpiring, setIsExpiring] = useState(false);
  const [timeToExpire, setTimeToExpire] = useState<number | null>(null);

  // Check if session is expiring soon (within 5 minutes)
  useEffect(() => {
    if (!session) {
      setIsExpiring(false);
      setTimeToExpire(null);
      return;
    }

    const checkExpiration = () => {
      const now = Date.now() / 1000; // Current time in seconds
      const expiresAt = session.expiresAt;
      const timeLeft = expiresAt - now;
      const fiveMinutes = 5 * 60; // 5 minutes in seconds

      setTimeToExpire(timeLeft);
      setIsExpiring(timeLeft <= fiveMinutes && timeLeft > 0);

      // Auto-refresh if session expires in 1 minute
      if (timeLeft <= 60 && timeLeft > 0) {
        refreshSession().catch(console.error);
      }
    };

    // Check immediately and then every 30 seconds
    checkExpiration();
    const interval = setInterval(checkExpiration, 30000);

    return () => clearInterval(interval);
  }, [session, refreshSession]);

  const extendSession = useCallback(async () => {
    try {
      await refreshSession();
    } catch (error) {
      console.error('Failed to extend session:', error);
      throw error;
    }
  }, [refreshSession]);

  const getSessionInfo = useCallback(() => {
    if (!session) return null;

    const now = Date.now() / 1000;
    const timeLeft = session.expiresAt - now;

    return {
      isValid: timeLeft > 0,
      expiresAt: new Date(session.expiresAt * 1000),
      timeToExpire: Math.max(0, timeLeft),
      isExpiring: timeLeft <= 300 && timeLeft > 0, // 5 minutes
    };
  }, [session]);

  return {
    session,
    loading: authLoading,
    isExpiring,
    timeToExpire,
    extendSession,
    getSessionInfo,
  };
}
