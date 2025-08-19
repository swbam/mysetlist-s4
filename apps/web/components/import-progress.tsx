"use client";

import { useEffect, useState } from "react";
import { Progress } from "@repo/design-system/components/ui/progress";

interface ImportStatus {
  stage: string;
  progress: number;
  message: string;
}

export function ImportProgress({ artistId }: { artistId: string }) {
  const [status, setStatus] = useState<ImportStatus | null>(null);

  useEffect(() => {
    if (!artistId) return;

    const eventSource = new EventSource(`/api/artists/${artistId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data);
      if (data.stage === "completed" || data.stage === "failed") {
        eventSource.close();
      }
    };

    return () => {
      eventSource.close();
    };
  }, [artistId]);

  if (!status || status.stage === "completed") {
    return null;
  }

  return (
    <div className="my-4">
      <p className="text-sm text-muted-foreground">{status.message}</p>
      <Progress value={status.progress} className="w-full" />
    </div>
  );
}
