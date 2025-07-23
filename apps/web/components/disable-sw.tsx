'use client';
import { useEffect, useState } from 'react';

interface ServiceWorkerStatus {
  active: boolean;
  version: string | null;
  cacheStatus: 'cleaning' | 'clean' | 'error';
}

export function ServiceWorkerManager() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    active: false,
    version: null,
    cacheStatus: 'cleaning'
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      cleanupServiceWorkers();
    }
  }, []);

  const cleanupServiceWorkers = async () => {
    try {
      // Get all current registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      // Unregister old/legacy service workers
      for (const registration of registrations) {
        // Check if this is the new optimized service worker
        const isCurrentSW = registration.scope.includes('/sw.js') && 
                           await isOptimizedServiceWorker(registration);
        
        if (!isCurrentSW) {
          console.log('[SW Manager] Removing legacy service worker:', registration.scope);
          await registration.unregister();
        } else {
          console.log('[SW Manager] Keeping optimized service worker:', registration.scope);
          setStatus(prev => ({ ...prev, active: true, version: 'v1.2.0' }));
        }
      }

      // Clean up old/stale caches
      await cleanupStaleCaches();
      
      // Register the new optimized service worker if not already present
      if (!registrations.some(reg => reg.scope.includes('/sw.js'))) {
        await registerOptimizedServiceWorker();
      }
      
      setStatus(prev => ({ ...prev, cacheStatus: 'clean' }));
    } catch (error) {
      console.error('[SW Manager] Error during cleanup:', error);
      setStatus(prev => ({ ...prev, cacheStatus: 'error' }));
    }
  };

  const isOptimizedServiceWorker = async (registration: ServiceWorkerRegistration): Promise<boolean> => {
    try {
      // Check if the service worker has our expected methods/structure
      if (!registration.active) return false;
      
      // Send a ping to check if it's our optimized version
      const channel = new MessageChannel();
      registration.active.postMessage({ action: 'VERSION_CHECK' }, [channel.port2]);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data?.version === 'v1.2.0');
        };
      });
    } catch {
      return false;
    }
  };

  const cleanupStaleCaches = async () => {
    if (!('caches' in window)) return;
    
    try {
      const cacheNames = await caches.keys();
      const staleCaches = cacheNames.filter(name => 
        name.startsWith('mysetlist-') && 
        !['mysetlist-v1.2.0', 'mysetlist-api-v1.2.0', 'mysetlist-static-v1.2.0'].includes(name)
      );
      
      console.log('[SW Manager] Removing stale caches:', staleCaches);
      await Promise.all(staleCaches.map(name => caches.delete(name)));
    } catch (error) {
      console.error('[SW Manager] Error cleaning caches:', error);
    }
  };

  const registerOptimizedServiceWorker = async () => {
    try {
      console.log('[SW Manager] Registering optimized service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              console.log('[SW Manager] New service worker installed');
              // Force activation of new worker
              newWorker.postMessage({ action: 'SKIP_WAITING' });
            }
          });
        }
      });
      
      setStatus(prev => ({ ...prev, active: true, version: 'v1.2.0' }));
    } catch (error) {
      console.error('[SW Manager] Failed to register service worker:', error);
    }
  };

  // Show status in development
  if (process.env.NODE_ENV === 'development' && status.cacheStatus === 'cleaning') {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: '#1f2937',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        zIndex: 9999,
        opacity: 0.8
      }}>
        🔧 Cleaning SW cache...
      </div>
    );
  }

  return null;
}

// Legacy export for backward compatibility
export const DisableServiceWorker = ServiceWorkerManager;
