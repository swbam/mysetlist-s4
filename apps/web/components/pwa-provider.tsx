'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';

interface PWAContextType {
  isInstalled: boolean;
  isOffline: boolean;
  deferredPrompt: any;
  installApp: () => Promise<void>;
  isUpdateAvailable: boolean;
  updateServiceWorker: () => void;
}

const PWAContext = createContext<PWAContextType>({
  isInstalled: false,
  isOffline: false,
  deferredPrompt: null,
  installApp: async () => {},
  isUpdateAvailable: false,
  updateServiceWorker: () => {},
});

export const usePWA = () => useContext(PWAContext);

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check online status
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('You\'re back online!');
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('You\'re offline. Some features may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('App installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Register service worker
    if ('serviceWorker' in navigator) {
      // In development, you might want to skip SW registration
      // or use a development-specific service worker
      if (process.env.NODE_ENV === 'production') {
        registerServiceWorker();
      } else {
        console.log('[PWA] Service Worker registration skipped in development');
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      setRegistration(reg);

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
              toast.info('A new version is available!', {
                action: {
                  label: 'Update',
                  onClick: () => updateServiceWorker(),
                },
                duration: Infinity,
              });
            }
          });
        }
      });

      // Check for updates periodically
      setInterval(() => {
        reg.update();
      }, 60 * 60 * 1000); // Check every hour
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) {
      toast.error('Installation not available');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('Installing app...');
    } else {
      toast.info('Installation cancelled');
    }
    
    setDeferredPrompt(null);
  };

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload once the new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isOffline,
        deferredPrompt,
        installApp,
        isUpdateAvailable,
        updateServiceWorker,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}