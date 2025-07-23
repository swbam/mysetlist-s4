'use client';

/**
 * Service Worker Registration and Management
 * Provides offline capabilities, caching, and background sync
 */

interface ServiceWorkerManager {
  register: () => Promise<ServiceWorkerRegistration | null>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  isSupported: () => boolean;
  getRegistration: () => Promise<ServiceWorkerRegistration | null>;
}

class MySetlistServiceWorker implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check for updates periodically
      this.scheduleUpdateCheck();
      
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Service Workers are not supported');
      return null;
    }

    try {
      console.log('[SW] Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      this.registration = registration;

      // Handle different service worker states
      if (registration.installing) {
        console.log('[SW] Service worker installing...');
        this.trackInstallProgress(registration.installing);
      } else if (registration.waiting) {
        console.log('[SW] Service worker waiting...');
        this.promptForUpdate(registration);
      } else if (registration.active) {
        console.log('[SW] Service worker active');
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('[SW] Update found...');
        const newWorker = registration.installing;
        
        if (newWorker) {
          this.trackInstallProgress(newWorker);
        }
      });

      // Handle controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading...');
        window.location.reload();
      });

      return registration;
    } catch (error) {
      console.error('[SW] Registration failed:', error);
      return null;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        const unregistered = await registration.unregister();
        console.log('[SW] Unregistered:', unregistered);
        return unregistered;
      }
      
      return true;
    } catch (error) {
      console.error('[SW] Unregistration failed:', error);
      return false;
    }
  }

  async update(): Promise<void> {
    if (!this.registration) {
      console.warn('[SW] No registration found for update');
      return;
    }

    try {
      await this.registration.update();
      console.log('[SW] Update check completed');
    } catch (error) {
      console.error('[SW] Update failed:', error);
    }
  }

  async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      return await navigator.serviceWorker.getRegistration();
    } catch (error) {
      console.error('[SW] Failed to get registration:', error);
      return null;
    }
  }

  private trackInstallProgress(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      console.log('[SW] State changed:', worker.state);
      
      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New service worker installed, but old one still controlling
          this.promptForUpdate(this.registration!);
        } else {
          // First time installation
          console.log('[SW] Service worker installed for the first time');
          this.showInstallNotification();
        }
      }
    });
  }

  private promptForUpdate(registration: ServiceWorkerRegistration): void {
    if (this.shouldAutoUpdate()) {
      this.skipWaiting(registration);
    } else {
      this.showUpdateNotification(registration);
    }
  }

  private shouldAutoUpdate(): boolean {
    // Auto-update in development or if user preference is set
    return (
      process.env.NODE_ENV === 'development' ||
      localStorage.getItem('mysetlist-auto-update') === 'true'
    );
  }

  private skipWaiting(registration: ServiceWorkerRegistration): void {
    if (registration.waiting) {
      registration.waiting.postMessage({ action: 'SKIP_WAITING' });
    }
  }

  private showInstallNotification(): void {
    // Show subtle notification that app is now available offline
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('MySetlist is now available offline!', {
        body: 'You can now browse artists and shows even without internet.',
        icon: '/icons/icon-192x192.png',
        silent: true,
      });
    }
  }

  private showUpdateNotification(registration: ServiceWorkerRegistration): void {
    // Create update notification UI
    const notification = document.createElement('div');
    notification.id = 'sw-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 350px;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">
          🚀 Update Available
        </div>
        <div style="font-size: 14px; margin-bottom: 12px; opacity: 0.9;">
          A new version of MySetlist is ready!
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="sw-update-btn" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">
            Update Now
          </button>
          <button id="sw-dismiss-btn" style="
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">
            Later
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Handle update button click
    const updateBtn = document.getElementById('sw-update-btn');
    const dismissBtn = document.getElementById('sw-dismiss-btn');

    updateBtn?.addEventListener('click', () => {
      this.skipWaiting(registration);
      notification.remove();
    });

    dismissBtn?.addEventListener('click', () => {
      notification.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  private scheduleUpdateCheck(): void {
    // Check for updates every 30 minutes
    this.updateCheckInterval = setInterval(() => {
      this.update();
    }, 30 * 60 * 1000);
  }

  private handleOnline(): void {
    console.log('[SW] Back online, syncing data...');
    
    // Trigger background sync
    if (this.registration?.sync) {
      this.registration.sync.register('vote-sync');
      this.registration.sync.register('follow-sync');
    }

    // Clean up stale cache
    if (this.registration) {
      this.registration.active?.postMessage({ action: 'CLEANUP_CACHE' });
    }
  }

  private handleOffline(): void {
    console.log('[SW] Gone offline, using cached data...');
    
    // Show offline indicator
    this.showOfflineNotification();
  }

  private showOfflineNotification(): void {
    const notification = document.createElement('div');
    notification.id = 'offline-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #f59e0b;
        color: white;
        padding: 8px 16px;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
      ">
        📱 You're offline. Some features may be limited.
      </div>
    `;

    document.body.appendChild(notification);

    // Remove when back online
    const removeNotification = () => {
      notification.remove();
      window.removeEventListener('online', removeNotification);
    };

    window.addEventListener('online', removeNotification);
  }

  // Public methods for cache management
  async clearCache(): Promise<void> {
    if (this.registration) {
      this.registration.active?.postMessage({ action: 'CLEANUP_CACHE' });
    }
  }

  async getCacheSize(): Promise<number> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.error('[SW] Failed to get cache size:', error);
      return 0;
    }
  }

  // Cleanup on page unload
  cleanup(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
  }
}

// Create singleton instance
export const serviceWorker = new MySetlistServiceWorker();

// Auto-register on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    serviceWorker.register();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    serviceWorker.cleanup();
  });
}

// Export utility functions
export const swUtils = {
  isOnline: () => typeof navigator !== 'undefined' ? navigator.onLine : true,
  
  requestNotificationPermission: async (): Promise<NotificationPermission> => {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  },
  
  enableAutoUpdate: () => {
    localStorage.setItem('mysetlist-auto-update', 'true');
  },
  
  disableAutoUpdate: () => {
    localStorage.removeItem('mysetlist-auto-update');
  },
  
  getCacheInfo: async () => {
    const size = await serviceWorker.getCacheSize();
    const isOnline = swUtils.isOnline();
    const registration = await serviceWorker.getRegistration();
    
    return {
      cacheSize: size,
      isOnline,
      isInstalled: !!registration,
      lastUpdate: registration?.installing ? 'Updating...' : 'Up to date',
    };
  },
};