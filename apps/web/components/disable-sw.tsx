'use client';
import { useEffect } from 'react';

export function DisableServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          if (reg.active?.scriptURL.includes('sw.js')) {
            reg.unregister();
          }
        });
      });
    }
  }, []);
  return null;
}
