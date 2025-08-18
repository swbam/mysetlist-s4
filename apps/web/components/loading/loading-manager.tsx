"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  loadingStates: LoadingState;
  setLoading: (key: string, isLoading: boolean) => void;
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    // Clear any existing timeout for this key
    const existingTimeout = timeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutsRef.current.delete(key);
    }

    if (isLoading) {
      // Set loading immediately
      setLoadingStates(prev => ({ ...prev, [key]: true }));
    } else {
      // Add a small delay before removing loading to prevent flashing
      const timeout = setTimeout(() => {
        setLoadingStates(prev => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
        timeoutsRef.current.delete(key);
      }, 150);
      timeoutsRef.current.set(key, timeout);
    }
  }, []);

  const isLoading = useCallback((key: string) => {
    return Boolean(loadingStates[key]);
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  const clearLoading = useCallback((key: string) => {
    const timeout = timeoutsRef.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(key);
    }
    setLoadingStates(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllLoading = useCallback(() => {
    // Clear all timeouts
    for (const timeout of timeoutsRef.current.values()) {
      clearTimeout(timeout);
    }
    timeoutsRef.current.clear();
    setLoadingStates({});
  }, []);

  const value: LoadingContextType = {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    clearLoading,
    clearAllLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

// Hook for component-specific loading states
export function useComponentLoading(componentId: string) {
  const { setLoading, isLoading, clearLoading } = useLoading();
  
  return {
    isLoading: isLoading(componentId),
    setLoading: (loading: boolean) => setLoading(componentId, loading),
    clearLoading: () => clearLoading(componentId),
  };
}

// Hook for API call loading states
export function useApiLoading() {
  const { setLoading, isLoading } = useLoading();
  
  const withLoading = useCallback(async <T>(
    key: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    try {
      setLoading(key, true);
      const result = await apiCall();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  return {
    withLoading,
    isLoading,
  };
}