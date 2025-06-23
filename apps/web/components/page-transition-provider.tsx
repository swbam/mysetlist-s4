'use client';

import { ReactNode } from 'react';
import { usePageTransition } from '@/hooks/use-page-transition';

interface PageTransitionProviderProps {
  children: ReactNode;
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  usePageTransition();
  
  return <>{children}</>;
}