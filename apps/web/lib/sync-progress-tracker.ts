export interface SyncProgress {
  artistId: string;
  artistName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  progress: {
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
    details: {
      songs: { synced: number; errors: number; total?: number };
      shows: { synced: number; errors: number; total?: number };
      venues: { synced: number; errors: number; total?: number };
      setlists: { synced: number; errors: number; total?: number };
    };
  };
}

export class SyncProgressTracker {
  private memoryStore = new Map<string, SyncProgress>();
  private readonly TTL = 3600; // 1 hour TTL for progress records

  constructor() {
    // Using in-memory storage
    // Future enhancement: Add Redis support for distributed systems
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    // Clean up old entries every 10 minutes
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, value] of this.memoryStore.entries()) {
          const age = now - new Date(value.updatedAt).getTime();
          if (age > this.TTL * 1000) {
            this.memoryStore.delete(key);
          }
        }
      },
      10 * 60 * 1000
    );
  }

  private getKey(artistId: string): string {
    return `sync:progress:${artistId}`;
  }

  async startSync(artistId: string, artistName: string): Promise<void> {
    const progress: SyncProgress = {
      artistId,
      artistName,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: {
        currentStep: 'Initializing',
        totalSteps: 4,
        completedSteps: 0,
        details: {
          songs: { synced: 0, errors: 0 },
          shows: { synced: 0, errors: 0 },
          venues: { synced: 0, errors: 0 },
          setlists: { synced: 0, errors: 0 },
        },
      },
    };

    await this.setProgress(artistId, progress);
  }

  async updateProgress(
    artistId: string,
    updates: {
      currentStep?: string;
      completedSteps?: number;
      details?: Partial<SyncProgress['progress']['details']>;
    }
  ): Promise<void> {
    const current = await this.getProgress(artistId);
    if (!current) return;

    current.updatedAt = new Date().toISOString();

    if (updates.currentStep) {
      current.progress.currentStep = updates.currentStep;
    }

    if (updates.completedSteps !== undefined) {
      current.progress.completedSteps = updates.completedSteps;
    }

    if (updates.details) {
      Object.assign(current.progress.details, updates.details);
    }

    await this.setProgress(artistId, current);
  }

  async completeSync(artistId: string, error?: string): Promise<void> {
    const current = await this.getProgress(artistId);
    if (!current) return;

    current.status = error ? 'failed' : 'completed';
    current.completedAt = new Date().toISOString();
    current.updatedAt = new Date().toISOString();

    if (error) {
      current.error = error;
    } else {
      current.progress.completedSteps = current.progress.totalSteps;
    }

    await this.setProgress(artistId, current);
  }

  async getProgress(artistId: string): Promise<SyncProgress | null> {
    const key = this.getKey(artistId);
    return this.memoryStore.get(key) || null;
  }

  async getAllProgress(): Promise<SyncProgress[]> {
    return Array.from(this.memoryStore.values());
  }

  async clearProgress(artistId: string): Promise<void> {
    const key = this.getKey(artistId);
    this.memoryStore.delete(key);
  }

  private async setProgress(
    artistId: string,
    progress: SyncProgress
  ): Promise<void> {
    const key = this.getKey(artistId);
    this.memoryStore.set(key, progress);
  }

  async cleanup(): Promise<void> {
    this.memoryStore.clear();
  }
}
