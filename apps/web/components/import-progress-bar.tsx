"use client";

import { Progress } from "@repo/design-system";
import { useImportProgress } from "~/hooks/useImportProgress";

interface Props {
  artistId: string | null;
  className?: string;
}

export function ImportProgressBar({ artistId, className }: Props) {
  const { progress } = useImportProgress(artistId);

  if (!artistId || !progress) return null;

  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className={className} aria-live="polite">
      <Progress value={percentage} />
      <p className="mt-1 text-xs text-muted-foreground">
        {progress.status === "completed"
          ? "Import complete"
          : progress.status === "error"
            ? "Import error"
            : `Importing songs… ${percentage}%`}
      </p>
    </div>
  );
}

