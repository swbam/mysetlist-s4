import { db } from "@repo/database";
import { importStatus, ImportStatus, importStageEnum } from "@repo/database";
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
  stage: typeof importStageEnum.enumValues[number],
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
      ...payload,
    })
    .onConflictDoUpdate({
      target: importStatus.artistId,
      set: payload,
    });

  bus.emit(artistId, payload);
}
