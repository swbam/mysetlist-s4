"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

interface LayoutContextValue {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleRouteChange = () => {
      setMobileMenuOpen(false);
    };

    window.addEventListener("popstate", handleRouteChange);
    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        isMobileMenuOpen,
        setMobileMenuOpen,
        isSidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}
