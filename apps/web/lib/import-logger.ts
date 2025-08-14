import { db, importLogs, type InsertImportLog } from "@repo/database";
import { createId } from "@paralleldrive/cuid2";

export type LogLevel = "info" | "warning" | "error" | "success" | "debug";

export interface ImportLogEntry {
  artistId: string;
  artistName?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  jobId?: string;
  level: LogLevel;
  stage: string;
  message: string;
  details?: any;
  itemsProcessed?: number;
  itemsTotal?: number;
  durationMs?: number;
  errorCode?: string;
  errorStack?: string;
}

export class ImportLogger {
  private artistId: string;
  private artistName?: string;
  private ticketmasterId?: string;
  private spotifyId?: string;
  private jobId?: string;
  private logs: ImportLogEntry[] = [];
  private batchSize = 10;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: {
    artistId: string;
    artistName?: string;
    ticketmasterId?: string;
    spotifyId?: string;
    jobId?: string;
  }) {
    this.artistId = config.artistId;
    this.artistName = config.artistName;
    this.ticketmasterId = config.ticketmasterId;
    this.spotifyId = config.spotifyId;
    this.jobId = config.jobId || createId();
  }

  private async flush() {
    if (this.logs.length === 0) return;

    const logsToFlush = [...this.logs];
    this.logs = [];

    try {
      await db.insert(importLogs).values(
        logsToFlush.map((log) => ({
          artistId: log.artistId,
          artistName: log.artistName,
          ticketmasterId: log.ticketmasterId,
          spotifyId: log.spotifyId,
          jobId: log.jobId,
          level: log.level as any,
          stage: log.stage,
          message: log.message,
          details: log.details,
          itemsProcessed: log.itemsProcessed,
          itemsTotal: log.itemsTotal,
          durationMs: log.durationMs,
          errorCode: log.errorCode,
          errorStack: log.errorStack,
        }))
      );
    } catch (error) {
      console.error("Failed to flush import logs:", error);
      // Re-add logs to queue on failure
      this.logs = [...logsToFlush, ...this.logs];
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 1000);
  }

  private async log(entry: Omit<ImportLogEntry, "artistId" | "artistName" | "ticketmasterId" | "spotifyId" | "jobId">) {
    const logEntry: ImportLogEntry = {
      ...entry,
      artistId: this.artistId,
      artistName: this.artistName,
      ticketmasterId: this.ticketmasterId,
      spotifyId: this.spotifyId,
      jobId: this.jobId,
    };

    this.logs.push(logEntry);

    // Auto-flush when batch size is reached
    if (this.logs.length >= this.batchSize) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }

    // Also log to console for debugging
    const consoleMethod = entry.level === "error" ? "error" : entry.level === "warning" ? "warn" : "log";
    console[consoleMethod](`[${entry.stage}] ${entry.message}`, entry.details || "");
  }

  async info(stage: string, message: string, details?: any) {
    await this.log({ level: "info", stage, message, details });
  }

  async warning(stage: string, message: string, details?: any) {
    await this.log({ level: "warning", stage, message, details });
  }

  async error(stage: string, message: string, error?: Error | any) {
    await this.log({
      level: "error",
      stage,
      message,
      details: error?.message || error,
      errorCode: error?.code,
      errorStack: error?.stack,
    });
  }

  async success(stage: string, message: string, details?: any) {
    await this.log({ level: "success", stage, message, details });
  }

  async debug(stage: string, message: string, details?: any) {
    if (process.env.NODE_ENV === "development") {
      await this.log({ level: "debug", stage, message, details });
    }
  }

  async progress(stage: string, message: string, itemsProcessed: number, itemsTotal: number, durationMs?: number) {
    await this.log({
      level: "info",
      stage,
      message,
      itemsProcessed,
      itemsTotal,
      durationMs,
      details: {
        percentage: Math.round((itemsProcessed / itemsTotal) * 100),
      },
    });
  }

  async complete() {
    await this.flush();
    if (this.flushTimer) clearTimeout(this.flushTimer);
  }

  getJobId() {
    return this.jobId;
  }
}

// Static methods for quick logging without creating an instance
export async function logImportInfo(artistId: string, stage: string, message: string, details?: any) {
  try {
    await db.insert(importLogs).values({
      artistId,
      level: "info" as any,
      stage,
      message,
      details,
    });
  } catch (error) {
    console.error("Failed to log import info:", error);
  }
}

export async function logImportError(artistId: string, stage: string, message: string, error?: Error | any) {
  try {
    await db.insert(importLogs).values({
      artistId,
      level: "error" as any,
      stage,
      message,
      details: error?.message || error,
      errorCode: error?.code,
      errorStack: error?.stack,
    });
  } catch (error) {
    console.error("Failed to log import error:", error);
  }
}

export async function logImportSuccess(artistId: string, stage: string, message: string, details?: any) {
  try {
    await db.insert(importLogs).values({
      artistId,
      level: "success" as any,
      stage,
      message,
      details,
    });
  } catch (error) {
    console.error("Failed to log import success:", error);
  }
}