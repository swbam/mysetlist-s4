"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";

export function ImportProgress({
  artistId,
  initialImportStatus,
  onComplete,
}: {
  artistId: string;
  initialImportStatus?: string;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<{
    stage: string;
    progress: number;
    message: string;
  } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!artistId || initialImportStatus === "complete") return;
    esRef.current?.close();
    const es = new EventSource(`/api/artists/${artistId}/stream`);
    esRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setStatus(data);
      if (data.stage === "completed" || data.stage === "failed") {
        es.close();
        onComplete();
      }
    };
    return () => es.close();
  }, [artistId, onComplete]);

  if (!status) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importing Artist</CardTitle>
        <CardDescription>{status.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={status.progress} />
      </CardContent>
    </Card>
  );
}
