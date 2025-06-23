'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { queueVote, queueAttendance, queueSetlistUpdate } from '@/lib/offline-sync';
import { useOffline } from './use-offline';

export function useOfflineActions() {
  const { executeWithFallback } = useOffline();

  const voteOnSong = useCallback(
    async (showId: string, songId: string, vote: 'up' | 'down') => {
      return executeWithFallback(
        async () => {
          // Online action - make API call
          const response = await fetch('/api/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ showId, songId, vote }),
          });

          if (!response.ok) {
            throw new Error('Failed to submit vote');
          }

          return response.json();
        },
        () => {
          // Offline action - queue for later
          queueVote(showId, songId, vote);
        },
        {
          showToast: true,
          toastMessage: 'Your vote has been saved and will sync when you\'re online.',
        }
      );
    },
    [executeWithFallback]
  );

  const updateAttendance = useCallback(
    async (showId: string, status: 'going' | 'interested' | 'not_going') => {
      return executeWithFallback(
        async () => {
          // Online action - make API call
          const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ showId, status }),
          });

          if (!response.ok) {
            throw new Error('Failed to update attendance');
          }

          return response.json();
        },
        () => {
          // Offline action - queue for later
          queueAttendance(showId, status);
        },
        {
          showToast: true,
          toastMessage: 'Your attendance has been saved and will sync when you\'re online.',
        }
      );
    },
    [executeWithFallback]
  );

  const updateSetlist = useCallback(
    async (setlistId: string, updates: any) => {
      return executeWithFallback(
        async () => {
          // Online action - make API call
          const response = await fetch(`/api/setlists/${setlistId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error('Failed to update setlist');
          }

          return response.json();
        },
        () => {
          // Offline action - queue for later
          queueSetlistUpdate(setlistId, updates);
        },
        {
          showToast: true,
          toastMessage: 'Your setlist changes have been saved and will sync when you\'re online.',
        }
      );
    },
    [executeWithFallback]
  );

  return {
    voteOnSong,
    updateAttendance,
    updateSetlist,
  };
}