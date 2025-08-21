import { db, importStatus } from "@repo/database";
import { eq } from "drizzle-orm";
import { EventEmitter } from "events";

const bus = new EventEmitter();

export function onProgress(artistId: string, fn: (p: any) => void) {
  bus.on(artistId, fn);
}

export function offProgress(artistId: string, fn: (p: any) => void) {
  bus.off(artistId, fn);
}

export async function report(
  artistId: string,
  stage: "initializing" | "syncing-identifiers" | "importing-songs" | "importing-shows" | "creating-setlists" | "completed" | "failed",
  progress: number,
  message: string
) {
  const payload = {
    stage,
    percentage: progress,
    message,
  };

  await db
    .insert(importStatus)
    .values({
      artistId,
      stage: payload.stage,
      percentage: payload.percentage,
      message: payload.message,
    })
    .onConflictDoUpdate({
      target: importStatus.artistId,
      set: {
        stage: payload.stage,
        percentage: payload.percentage,
        message: payload.message,
        updatedAt: new Date(),
      },
    });

  bus.emit(artistId, payload);
}
