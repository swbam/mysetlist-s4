"use client";

import { Progress } from "@repo/design-system/components/ui/progress";
import { useEffect, useState } from "react";

export interface ImportProgressData {
  phase: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;
  message?: string;
  artistId?: string;
  artistName?: string;
  error?: string;
}

interface ImportProgressProps {
  artistId?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function ImportProgress({
  artistId,
  onComplete,
  onError,
}: ImportProgressProps) {
  const [progressData, setProgressData] = useState<ImportProgressData>({
    phase: "Initializing",
    status: "pending",
    progress: 0,
  });

  useEffect(() => {
    if (!artistId) return;

    // Simulate progress for now
    const phases = [
      { phase: "Fetching artist data", progress: 25 },
      { phase: "Processing shows", progress: 50 },
      { phase: "Importing setlists", progress: 75 },
      { phase: "Finalizing", progress: 100 },
    ];

    let currentPhase = 0;
    const interval = setInterval(() => {
      if (currentPhase < phases.length) {
        const phase = phases[currentPhase];
        if (phase) {
          setProgressData({
            phase: phase.phase,
            status: "in_progress",
            progress: phase.progress,
            artistId,
          });
        }
        currentPhase++;
      } else {
        setProgressData((prev) => ({
          ...prev,
          status: "completed",
          phase: "Import completed",
        }));
        onComplete?.();
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [artistId, onComplete]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Import Progress</h3>
        <span className="text-sm text-muted-foreground">
          {progressData.progress}%
        </span>
      </div>
      <Progress value={progressData.progress} className="h-2" />
      <p className="text-sm text-muted-foreground">{progressData.phase}</p>
      {progressData.error && (
        <p className="text-sm text-red-600">{progressData.error}</p>
      )}
    </div>
  );
}