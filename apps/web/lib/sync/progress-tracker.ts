import { Redis } from "@upstash/redis";
import { env } from "@repo/env";

export interface SyncProgress {
  artistId: string;
  artistName: string;
  status: "pending" | "syncing" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  steps: {
    artist: {
      status: "pending" | "syncing" | "completed" | "failed";
      count?: number;
    };
    albums: {
      status: "pending" | "syncing" | "completed" | "failed";
      count?: number;
    };
    songs: {
      status: "pending" | "syncing" | "completed" | "failed";
      count?: number;
    };
    shows: {
      status: "pending" | "syncing" | "completed" | "failed";
      count?: number;
    };
    setlists: {
      status: "pending" | "syncing" | "completed" | "failed";
      count?: number;
    };
  };
  error?: string;
}

export class SyncProgressTracker {
  private redis: Redis | null;
  private keyPrefix = "sync:progress:";
  private ttl = 3600; // 1 hour TTL

  constructor() {
    if (env["UPSTASH_REDIS_REST_URL"] && env["UPSTASH_REDIS_REST_TOKEN"]) {
      this.redis = new Redis({
        url: env["UPSTASH_REDIS_REST_URL"],
        token: env["UPSTASH_REDIS_REST_TOKEN"],
      });
    } else {
      this.redis = null;
    }
  }

  async startSync(artistId: string, artistName: string): Promise<void> {
    const progress: SyncProgress = {
      artistId,
      artistName,
      status: "pending",
      startedAt: new Date(),
      steps: {
        artist: { status: "pending" },
        albums: { status: "pending" },
        songs: { status: "pending" },
        shows: { status: "pending" },
        setlists: { status: "pending" },
      },
    };

    if (this.redis) {
      await this.redis.setex(
        `${this.keyPrefix}${artistId}`,
        this.ttl,
        JSON.stringify(progress),
      );
    }
  }

  async updateStepStatus(
    artistId: string,
    step: keyof SyncProgress["steps"],
    status: "pending" | "syncing" | "completed" | "failed",
    count?: number,
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = `${this.keyPrefix}${artistId}`;
    const data = await this.redis.get(key);

    if (data) {
      const progress = JSON.parse(data as string) as SyncProgress;
      progress.steps[step].status = status;
      if (count !== undefined) {
        progress.steps[step].count = count;
      }

      // Update overall status
      const allSteps = Object.values(progress.steps);
      if (allSteps.some((s) => s.status === "failed")) {
        progress.status = "failed";
      } else if (allSteps.every((s) => s.status === "completed")) {
        progress.status = "completed";
        progress.completedAt = new Date();
      } else if (allSteps.some((s) => s.status === "syncing")) {
        progress.status = "syncing";
      }

      await this.redis.setex(key, this.ttl, JSON.stringify(progress));
    }
  }

  async getProgress(artistId: string): Promise<SyncProgress | null> {
    if (!this.redis) {
      return null;
    }

    const data = await this.redis.get(`${this.keyPrefix}${artistId}`);
    return data ? JSON.parse(data as string) : null;
  }

  async setError(artistId: string, error: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = `${this.keyPrefix}${artistId}`;
    const data = await this.redis.get(key);

    if (data) {
      const progress = JSON.parse(data as string) as SyncProgress;
      progress.status = "failed";
      progress.error = error;
      progress.completedAt = new Date();

      await this.redis.setex(key, this.ttl, JSON.stringify(progress));
    }
  }

  async clearProgress(artistId: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.del(`${this.keyPrefix}${artistId}`);
  }
}
