'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { offlineSync } from '@/lib/offline-sync';
import { usePWA } from '@/components/pwa-provider';

export function useOffline() {
  const { isOffline } = usePWA();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Update queue count
    const updateQueueCount = () => {
      const status = offlineSync.getQueueStatus();
      setQueueCount(status.count);
    };

    updateQueueCount();
    
    // Check periodically
    const interval = setInterval(updateQueueCount, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const executeWithFallback = useCallback(
    async <T,>(
      onlineAction: () => Promise<T>,
      offlineAction: () => void,
      options?: {
        showToast?: boolean;
        toastMessage?: string;
      }
    ): Promise<T | void> => {
      if (!isOffline) {
        try {
          return await onlineAction();
        } catch (error) {
          // Network error, fall back to offline
          offlineAction();
          
          if (options?.showToast !== false) {
            toast.info(
              options?.toastMessage || 'Action saved offline. It will sync when you\'re back online.'
            );
          }
          
          throw error;
        }
      } else {
        // Already offline
        offlineAction();
        
        if (options?.showToast !== false) {
          toast.info(
            options?.toastMessage || 'You\'re offline. This action will sync when you reconnect.'
          );
        }
      }
    },
    [isOffline]
  );

  const syncNow = useCallback(async () => {
    if (isOffline) {
      toast.error('Cannot sync while offline');
      return;
    }

    try {
      await offlineSync.syncQueue();
      toast.success('Offline queue synced successfully');
    } catch (error) {
      toast.error('Failed to sync offline queue');
    }
  }, [isOffline]);

  return {
    isOffline,
    queueCount,
    executeWithFallback,
    syncNow,
  };
}