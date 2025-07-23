'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if we're running on the client side
 * Prevents hydration mismatches by ensuring consistent server/client renders
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
}

/**
 * Hook to generate stable IDs that work with SSR
 * Returns undefined on server, stable ID on client
 */
export function useStableId(prefix = 'id') {
  const [id, setId] = useState<string>();
  
  useEffect(() => {
    // Use crypto.randomUUID if available, fallback to timestamp
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      setId(`${prefix}-${crypto.randomUUID()}`);
    } else {
      setId(`${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [prefix]);
  
  return id;
}

/**
 * Hook for using browser APIs safely
 * Returns null on server, actual value on client
 */
export function useBrowserValue<T>(
  getValue: () => T,
  deps: React.DependencyList = []
): T | null {
  const [value, setValue] = useState<T | null>(null);
  
  useEffect(() => {
    setValue(getValue());
  }, deps);
  
  return value;
}