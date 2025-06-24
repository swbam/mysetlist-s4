'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { usePWA } from './pwa-provider';

export function InstallPrompt() {
  const { isInstalled, deferredPrompt, installApp } = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    // Show banner after user has engaged with the app
    const timer = setTimeout(() => {
      if (!isInstalled && deferredPrompt && !dismissed) {
        setShowBanner(true);
      }
    }, 30000); // Show after 30 seconds

    return () => clearTimeout(timer);
  }, [isInstalled, deferredPrompt, dismissed]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    await installApp();
    setShowBanner(false);
  };

  if (!showBanner || isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-lg md:border">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">Install MySetlist App</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get the full app experience with offline access, notifications, and faster performance.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button onClick={handleInstall} size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Install App
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              Not Now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}