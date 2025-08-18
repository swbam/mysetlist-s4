import { db, syncProgress } from "@repo/database";
import { eq } from "drizzle-orm";
import { EventEmitter } from "events";
import { ImportStage } from "../../types/common";

const bus = new EventEmitter();

export function onProgress(jobId: string, fn: (p: any) => void) {
  bus.on(jobId, fn);
}
export function offProgress(jobId: string, fn: (p: any) => void) {
  bus.off(jobId, fn);
}

export async function report(
  jobId: string,
  stage: ImportStage,
  progress: number,
  message: string,
) {
  const payload = {
    jobId,
    step: stage,
    status: "in_progress",
    progress,
    message,
    updatedAt: new Date(),
  };

  await db
    .insert(syncProgress)
    .values(payload)
    .onConflictDoUpdate({
      target: [syncProgress.jobId, syncProgress.step],
      set: {
        status: "in_progress",
        progress: payload.progress,
        message: payload.message,
        updatedAt: payload.updatedAt,
      },
    });

  bus.emit(jobId, payload);
}
