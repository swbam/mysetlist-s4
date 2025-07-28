"use client";

import type { ReactNode } from "react";
import { PageErrorBoundary } from "./page-error-boundary";

interface ShowErrorBoundaryProps {
  children: ReactNode;
  showDate?: string;
}

export function ShowErrorBoundary({
  children,
  showDate,
}: ShowErrorBoundaryProps) {
  const ErrorBoundary = PageErrorBoundary as any;

  return (
    <ErrorBoundary
      fallbackTitle={
        showDate ? `Error loading show from ${showDate}` : "Error loading show"
      }
      fallbackDescription="We couldn't load this show's information. The show data might still be syncing or there was a temporary issue."
      showBackButton={true}
    >
      {children}
    </ErrorBoundary>
  );
}
