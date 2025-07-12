'use client';

import { useCallback, useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  registration?: ServiceWorkerRegistration;
}

interface ServiceWorkerOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onInstalled?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
  enableNotifications?: boolean;
  enableBackgroundSync?: boolean;
}

export function useServiceWorker(options: ServiceWorkerOptions = {}) {
  const {
    onUpdate,
    onInstalled,
    onOffline,
    onOnline,
    enableNotifications = true,
    enableBackgroundSync = true,
  } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    hasUpdate: false,
  });

  const [offlineActions, setOfflineActions] = useState<any[]>([]);

  // Register service worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration,
      }));

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) {
          return;
        }

        setState((prev) => ({ ...prev, isInstalling: true }));

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New service worker is waiting
              setState((prev) => ({
                ...prev,
                isWaiting: true,
                hasUpdate: true,
                isInstalling: false,
              }));
              onUpdate?.(registration);
            } else {
              // First time install
              setState((prev) => ({ ...prev, isInstalling: false }));
              onInstalled?.();
            }
          }
        });
      });

      // Check for waiting service worker
      if (registration.waiting) {
        setState((prev) => ({
          ...prev,
          isWaiting: true,
          hasUpdate: true,
        }));
        onUpdate?.(registration);
      }

      return registration;
    } catch (_error) {
      return null;
    }
  }, [state.isSupported, onUpdate, onInstalled]);

  // Update service worker
  const update = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setState((prev) => ({ ...prev, isWaiting: false, hasUpdate: false }));

      // Reload page to get new version
      window.location.reload();
    }
  }, [state.registration]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!enableNotifications || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, [enableNotifications]);

  // Send message to service worker
  const sendMessage = useCallback((message: any) => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }, []);

  // Cache important data for offline use
  const cacheData = useCallback(async (key: string, data: any) => {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cache = await caches.open('mysetlist-data-v1');
      await cache.put(
        key,
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
    } catch (_error) {}
  }, []);

  // Get cached data
  const getCachedData = useCallback(async (key: string) => {
    if (!('caches' in window)) {
      return null;
    }

    try {
      const cache = await caches.open('mysetlist-data-v1');
      const response = await cache.match(key);
      if (response) {
        return await response.json();
      }
    } catch (_error) {}
    return null;
  }, []);

  // Store offline action
  const storeOfflineAction = useCallback(
    async (action: any) => {
      const actions = [...offlineActions, { ...action, id: Date.now() }];
      setOfflineActions(actions);

      // Also store in cache for persistence
      await cacheData('/offline-actions', actions);

      // Register for background sync if supported
      if (enableBackgroundSync && (state.registration as any)?.sync) {
        try {
          await (state.registration as any).sync.register('offline-actions');
        } catch (_error) {}
      }
    },
    [offlineActions, cacheData, enableBackgroundSync, state.registration]
  );

  // Clear offline actions
  const clearOfflineActions = useCallback(async () => {
    setOfflineActions([]);
    await cacheData('/offline-actions', []);
  }, [cacheData]);

  // Check if specific URL is cached
  const isCached = useCallback(async (url: string) => {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(url);
        if (response) {
          return true;
        }
      }
      return false;
    } catch (_error) {
      return false;
    }
  }, []);

  // Network status effects
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      onOnline?.();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  // Listen for service worker messages
  useEffect(() => {
    if (!state.isSupported) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const { data } = event;

      if (data.type === 'CACHE_UPDATED') {
      } else if (data.type === 'OFFLINE_ACTION_SYNCED') {
        setOfflineActions((prev) =>
          prev.filter((action) => action.id !== data.action.id)
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [state.isSupported]);

  // Load cached offline actions on mount
  useEffect(() => {
    const loadOfflineActions = async () => {
      const cached = await getCachedData('/offline-actions');
      if (cached && Array.isArray(cached)) {
        setOfflineActions(cached);
      }
    };

    loadOfflineActions();
  }, [getCachedData]);

  // Auto-register service worker - DISABLED to prevent conflicts
  // useEffect(() => {
  //   if (state.isSupported && !state.isRegistered) {
  //     register();
  //   }
  // }, [state.isSupported, state.isRegistered, register]);

  return {
    ...state,
    register,
    update,
    requestNotificationPermission,
    sendMessage,
    cacheData,
    getCachedData,
    storeOfflineAction,
    clearOfflineActions,
    isCached,
    offlineActions,
  };
}

// Hook for managing offline functionality
export function useOfflineManager() {
  const { isOnline, storeOfflineAction, offlineActions, clearOfflineActions } =
    useServiceWorker();

  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    setIsOfflineMode(!isOnline);
  }, [isOnline]);

  const handleOfflineAction = useCallback(
    async (action: 'vote' | 'follow' | 'comment' | 'attend', data: any) => {
      if (isOnline) {
        // If online, perform action immediately
        return data;
      }

      // If offline, store for later sync
      await storeOfflineAction({
        type: action,
        data,
        timestamp: Date.now(),
      });

      return { offline: true };
    },
    [isOnline, storeOfflineAction]
  );

  const getPendingActionsCount = useCallback(() => {
    return offlineActions.length;
  }, [offlineActions]);

  const getPendingActionsByType = useCallback(
    (type: string) => {
      return offlineActions.filter((action) => action.type === type);
    },
    [offlineActions]
  );

  return {
    isOnline,
    isOfflineMode,
    handleOfflineAction,
    getPendingActionsCount,
    getPendingActionsByType,
    clearOfflineActions,
    offlineActions,
  };
}
