"use client";

import React from "react";
import { ImportProgress, type ImportProgressData } from "./ImportProgress";

interface ImportProgressWrapperProps {
  artistId?: string;
  children?: React.ReactNode;
  onProgress?: (data: ImportProgressData) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ImportProgressWrapper({
  artistId,
  children,
  onProgress,
  onComplete,
  onError,
  className,
}: ImportProgressWrapperProps) {
  return (
    <div className={className}>
      {artistId && (
        <ImportProgress
          artistId={artistId}
          onComplete={onComplete}
          onError={onError}
        />
      )}
      {children}
    </div>
  );
}