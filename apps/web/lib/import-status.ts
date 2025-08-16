import { createServiceClient } from "./supabase/server";
import { Redis } from "ioredis";

// Initialize Redis client with correct credentials
const redis = new Redis({
  username: 'default',
  password: 'D0ph9gV9LPCbAq271oij61iRaoqnK3o6',
  host: 'redis-15718.c44.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 15718,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export interface ImportStatus {
  stage: 
    | "initializing"
    | "syncing-identifiers"
    | "importing-songs"
    | "importing-shows"
    | "creating-setlists"
    | "completed"
    | "failed";
  progress: number;
  message: string;
  error?: string;
  artistId?: string;
  artistName?: string;
  slug?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function updateImportStatus(
  jobId: string,
  status: Partial<ImportStatus>,
): Promise<void> {
  try {
    // Update Redis cache and publish for real-time updates
    const fullStatus = {
      ...status,
      updatedAt: new Date().toISOString(),
    };
    
    // Store in Redis cache (expires after 5 minutes)
    await redis.setex(
      `import:status:${jobId}`,
      300,
      JSON.stringify(fullStatus)
    );
    
    // Publish to Redis channel for SSE subscribers
    await redis.publish(
      `import:progress:${jobId}`,
      JSON.stringify(fullStatus)
    );
    
    // Also update database for persistence
    const supabase = createServiceClient();

    // First check if record exists
    const { data: existing } = await supabase
      .from("import_status")
      .select("job_id")
      .eq("job_id", jobId)
      .single();

    const now = new Date().toISOString();
    
    const updateData = {
      job_id: jobId,
      stage: status.stage,
      percentage: status.progress || 0,  // Map progress to percentage
      message: status.message || "",
      error: status.error || null,
      artist_id: status.artistId || null,
      total_songs: status.totalSongs || null,
      total_shows: status.totalShows || null,
      total_venues: status.totalVenues || null,
      artist_name: status.artistName || null,
      completed_at: status.completedAt || null,
      updated_at: now,
      ...(existing ? {} : { created_at: now }),
    };

    const { error } = await supabase.from("import_status").upsert(updateData);
    
    if (error) {
      console.error(`[IMPORT STATUS] Failed to update status for ${jobId}:`, error);
    }
  } catch (error) {
    console.error("Failed to update import status:", error);
  }
}

export async function getImportStatus(jobId: string): Promise<ImportStatus | null> {
  try {
    // Check Redis cache first
    const cached = await redis.get(`import:status:${jobId}`);
    if (cached) {
      return JSON.parse(cached) as ImportStatus;
    }
    
    // Fallback to database
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("import_status")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (error || !data) {
      return null;
    }

    const status: ImportStatus = {
      stage: data.stage,
      progress: data.percentage || 0,  // Map percentage to progress
      message: data.message || "",
      error: data.error,
      artistId: data.artist_id,
      artistName: data.artist_name,
      totalSongs: data.total_songs,
      totalShows: data.total_shows,
      totalVenues: data.total_venues,
      completedAt: data.completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    
    // Cache for next time (short TTL)
    await redis.setex(
      `import:status:${jobId}`,
      60, // 1 minute cache
      JSON.stringify(status)
    );
    
    return status;
  } catch (error) {
    console.warn("[IMPORT STATUS] Failed to get import status (non-blocking):", error);
    // Fallback: don't let import status failures break the actual import
    return null;
  }
}
