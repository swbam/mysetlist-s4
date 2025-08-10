// Progress tracker implementation (Redis/Upstash not used in this project)

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
  private redis: any = null; // Redis not used in this project
  private keyPrefix = "sync:progress:";
  private ttl = 3600; // 1 hour TTL
  private inMemoryStore: Map<string, SyncProgress> = new Map();

  constructor() {
    // We don't use Redis/Upstash, so we'll use in-memory storage
    this.redis = null;
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

    // Store in memory instead of Redis
    this.inMemoryStore.set(`${this.keyPrefix}${artistId}`, progress);
  }

  async updateStepStatus(
    artistId: string,
    step: keyof SyncProgress["steps"],
    status: "pending" | "syncing" | "completed" | "failed",
    count?: number,
  ): Promise<void> {
    const key = `${this.keyPrefix}${artistId}`;
    const progress = this.inMemoryStore.get(key);

    if (progress) {
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

      this.inMemoryStore.set(key, progress);
    }
  }

  async getProgress(artistId: string): Promise<SyncProgress | null> {
    return this.inMemoryStore.get(`${this.keyPrefix}${artistId}`) || null;
  }

  async setError(artistId: string, error: string): Promise<void> {
    const key = `${this.keyPrefix}${artistId}`;
    const progress = this.inMemoryStore.get(key);

    if (progress) {
      progress.status = "failed";
      progress.error = error;
      progress.completedAt = new Date();

      this.inMemoryStore.set(key, progress);
    }
  }

  async clearProgress(artistId: string): Promise<void> {
    this.inMemoryStore.delete(`${this.keyPrefix}${artistId}`);
  }
}
