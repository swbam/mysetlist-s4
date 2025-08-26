"use client";

import { Progress } from "@repo/design-system/progress";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { SyncProgress } from "~/lib/sync/progress-tracker";

interface SyncProgressDisplayProps {
  artistId: string;
  onComplete?: () => void;
}

export function SyncProgressDisplay({
  artistId,
  onComplete,
}: SyncProgressDisplayProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/sync/progress/${artistId}`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data.progress);

          if (
            (data.progress.status === "completed" ||
              data.progress.status === "failed") &&
            onComplete
          ) {
            onComplete();
          }
        } else if (response.status === 404) {
          setError("No sync in progress");
        }
      } catch (_err) {
        setError("Failed to fetch progress");
      }
    };

    // Check immediately
    checkProgress();

    // Then check every 2 seconds
    const interval = setInterval(checkProgress, 2000);

    return () => clearInterval(interval);
  }, [artistId, onComplete]);

  if (error) {
    return null;
  }

  if (!progress) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading sync status...
      </div>
    );
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "syncing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getOverallProgress = () => {
    const steps = Object.values(progress.steps);
    const completed = steps.filter((s) => s.status === "completed").length;
    return (completed / steps.length) * 100;
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sync Progress</h3>
        <span className="text-muted-foreground text-sm">
          {Math.round(getOverallProgress())}%
        </span>
      </div>

      <Progress value={getOverallProgress()} className="h-2" />

      <div className="space-y-2">
        {Object.entries(progress.steps).map(([step, data]) => (
          <div key={step} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {getStepIcon(data.status)}
              <span className="capitalize">{step}</span>
            </div>
            {data.count !== undefined && data.count > 0 && (
              <span className="text-muted-foreground">{data.count} items</span>
            )}
          </div>
        ))}
      </div>

      {progress.error && (
        <div className="rounded bg-red-50 p-2 text-red-600 text-sm">
          Error: {progress.error}
        </div>
      )}

      {progress.status === "completed" && (
        <div className="rounded bg-green-50 p-2 text-green-600 text-sm">
          Sync completed successfully!
        </div>
      )}
    </div>
  );
}
