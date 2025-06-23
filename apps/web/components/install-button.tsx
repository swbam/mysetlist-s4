'use client';

import { Download } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { usePWA } from './pwa-provider';

export function InstallButton() {
  const { isInstalled, deferredPrompt, installApp } = usePWA();

  // Don't show if already installed or no prompt available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <Button
      onClick={installApp}
      variant="ghost"
      size="sm"
      className="hidden md:flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      <span>Install</span>
    </Button>
  );
}