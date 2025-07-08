'use client';

import { usePageTransition } from '@/hooks/use-page-transition';
import type { ReactNode } from 'react';

interface PageTransitionProviderProps {
  children: ReactNode;
}

export function PageTransitionProvider({
  children,
}: PageTransitionProviderProps) {
  usePageTransition();

  return <>{children}</>;
}
