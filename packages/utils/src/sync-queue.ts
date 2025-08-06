import { createClient } from "@supabase/supabase-js";
import { Database } from "@repo/database";

interface SyncJobData {
  entityType: 'artist' | 'venue' | 'show';
  entityId: string;
  spotifyId?: string;
  ticketmasterId?: string;
  setlistfmId?: string;
  jobType: 'full_sync' | 'shows_only' | 'catalog_only' | 'update';
  priority: 1 | 2 | 3; // 1=high (user-triggered), 2=normal, 3=low (maintenance)
  metadata?: Record<string, any>;
}

export class SyncQueue {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  // Enqueue a sync job (fast, non-blocking)
  async enqueue(jobData: SyncJobData): Promise<string> {
    const { data, error } = await this.supabase
      .from("sync_jobs")
      .insert({
        entityType: jobData.entityType,
        entityId: jobData.entityId,
        spotifyId: jobData.spotifyId,
        ticketmasterId: jobData.ticketmasterId,
        setlistfmId: jobData.setlistfmId,
        jobType: jobData.jobType,
        priority: jobData.priority,
        metadata: jobData.metadata,
        status: "pending",
        totalSteps: this.getTotalStepsForJobType(jobData.jobType),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to enqueue sync job:", error);
      throw error;
    }

    // Trigger the background processor (non-blocking)
    this.triggerBackgroundProcessing(data.id);

    return data.id;
  }

  // Get job status (for UI updates)
  async getJobStatus(jobId: string) {
    const [jobResult, progressResult] = await Promise.all([
      this.supabase
        .from("sync_jobs")
        .select("*")
        .eq("id", jobId)
        .single(),
      this.supabase
        .from("sync_progress")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
    ]);

    return {
      job: jobResult.data,
      progress: progressResult.data || [],
      error: jobResult.error || progressResult.error
    };
  }

  // Update job progress (called by processors)
  async updateProgress(jobId: string, step: string, progress: number, message?: string) {
    await this.supabase
      .from("sync_progress")
      .insert({
        job_id: jobId,
        step,
        status: progress === 100 ? "completed" : "in_progress",
        progress,
        message,
      });

    // Update job's current step
    await this.supabase
      .from("sync_jobs")
      .update({
        current_step: step,
        completed_steps: progress === 100 ? 
          this.supabase.sql`completed_steps + 1` : 
          this.supabase.sql`completed_steps`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  // Mark job as completed
  async completeJob(jobId: string, status: "completed" | "failed" | "partial", error?: string) {
    await this.supabase
      .from("sync_jobs")
      .update({
        status,
        error,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  // Get pending jobs (for background processors)
  async getPendingJobs(limit = 10) {
    const { data, error } = await this.supabase
      .from("sync_jobs")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: true }) // 1=high priority first
      .order("created_at", { ascending: true }) // FIFO within priority
      .limit(limit);

    if (error) {
      console.error("Failed to get pending jobs:", error);
      return [];
    }

    return data || [];
  }

  // Background processing trigger (non-blocking)
  private async triggerBackgroundProcessing(jobId: string) {
    // In production, this would trigger a queue processor
    // For now, we'll use a simple API call
    try {
      fetch("/api/sync/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch(() => {
        // Silently fail - background processing will pick it up
      });
    } catch {
      // Non-blocking - job will be processed by scheduled workers
    }
  }

  private getTotalStepsForJobType(jobType: string): number {
    switch (jobType) {
      case "full_sync": return 5; // artist info, shows, songs, analytics, finalize
      case "shows_only": return 3; // shows, basic info, finalize
      case "catalog_only": return 2; // songs, finalize
      case "update": return 1; // update existing data
      default: return 1;
    }
  }

  // Real-time subscription for job updates
  subscribeToJob(jobId: string, callback: (progress: any) => void) {
    return this.supabase
      .channel(`sync-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sync_progress",
          filter: `job_id=eq.${jobId}`,
        },
        callback
      )
      .subscribe();
  }
}

// Singleton instance
let syncQueueInstance: SyncQueue | null = null;

export function getSyncQueue(): SyncQueue {
  if (!syncQueueInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }
    
    syncQueueInstance = new SyncQueue(supabaseUrl, supabaseKey);
  }
  
  return syncQueueInstance;
}