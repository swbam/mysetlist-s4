'use client';

import type { ReactNode } from 'react';
import { PageErrorBoundary } from './page-error-boundary';

interface TrendingErrorBoundaryProps {
  children: ReactNode;
}

export function TrendingErrorBoundary({
  children,
}: TrendingErrorBoundaryProps) {
  const ErrorBoundary = PageErrorBoundary as any;
  
  return (
    <ErrorBoundary
      fallbackTitle="Error loading trending content"
      fallbackDescription="We couldn't load the trending data. This might be due to a temporary issue with our trending calculations. Please try again in a moment."
      showBackButton={false}
    >
      {children}
    </ErrorBoundary>
  );
}
