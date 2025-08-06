'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '~/lib/supabase/client';

// Define types locally since they may not exist in database package
interface SyncJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  current_step: string | null;
  total_steps: number;
  completed_steps: number;
  error?: string;
}

interface SyncProgress {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

interface SyncStatus {
  job: SyncJob | null;
  progress: SyncProgress[];
  isLoading: boolean;
  error: string | null;
  currentStep: string | null;
  overallProgress: number;
  isCompleted: boolean;
  isFailed: boolean;
}

export function useSyncStatus(jobId: string | null): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    job: null,
    progress: [],
    isLoading: true,
    error: null,
    currentStep: null,
    overallProgress: 0,
    isCompleted: false,
    isFailed: false,
  });

  const supabase = createClient();

  const fetchStatus = useCallback(async () => {
    if (!jobId) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const [jobResult, progressResult] = await Promise.all([
        supabase
          .from('sync_jobs')
          .select('*')
          .eq('id', jobId)
          .single(),
        supabase
          .from('sync_progress')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
      ]);

      if (jobResult.error) {
        setStatus(prev => ({
          ...prev,
          error: jobResult.error.message,
          isLoading: false,
        }));
        return;
      }

      const job = jobResult.data;
      const progress = progressResult.data || [];
      
      // Calculate overall progress
      const overallProgress = job.total_steps > 0 
        ? Math.round((job.completed_steps / job.total_steps) * 100)
        : 0;

      setStatus({
        job,
        progress,
        isLoading: false,
        error: null,
        currentStep: job.current_step,
        overallProgress,
        isCompleted: job.status === 'completed',
        isFailed: job.status === 'failed',
      });

    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch sync status',
        isLoading: false,
      }));
    }
  }, [jobId, supabase]);

  // Real-time subscription
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`sync-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_progress',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          // Refetch status on any progress update
          fetchStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'sync_jobs',
          filter: `id=eq.${jobId}`,
        },
        () => {
          // Refetch status on job update
          fetchStatus();
        }
      )
      .subscribe();

    // Initial fetch
    fetchStatus();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, fetchStatus, supabase]);

  return status;
}

// Hook for managing artist sync
export function useArtistSync() {
  const [activeSyncs, setActiveSyncs] = useState<Record<string, string>>({});

  const triggerArtistSync = useCallback(async (
    artistId: string, 
    spotifyId: string,
    jobType: 'full_sync' | 'shows_only' | 'catalog_only' = 'full_sync'
  ) => {
    try {
      const response = await fetch('/api/artists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          spotifyId,
          jobType,
          priority: 1, // High priority for user-triggered syncs
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      const { jobId } = await response.json();
      
      setActiveSyncs(prev => ({
        ...prev,
        [artistId]: jobId,
      }));

      return jobId;

    } catch (error) {
      console.error('Failed to trigger artist sync:', error);
      throw error;
    }
  }, []);

  const getSyncJobId = useCallback((artistId: string) => {
    return activeSyncs[artistId] || null;
  }, [activeSyncs]);

  const clearSync = useCallback((artistId: string) => {
    setActiveSyncs(prev => {
      const updated = { ...prev };
      delete updated[artistId];
      return updated;
    });
  }, []);

  return {
    triggerArtistSync,
    getSyncJobId,
    clearSync,
    activeSyncs,
  };
}