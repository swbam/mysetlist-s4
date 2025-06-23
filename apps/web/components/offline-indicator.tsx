'use client';

import { WifiOff } from 'lucide-react';
import { usePWA } from './pwa-provider';

export function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground py-2 px-4 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline - Some features may be limited</span>
      </div>
    </div>
  );
}