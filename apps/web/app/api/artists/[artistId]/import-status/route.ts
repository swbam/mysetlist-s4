import { type NextRequest, NextResponse } from "next/server";
import { CacheClient, cacheKeys } from "~/lib/cache/redis";

export const dynamic = "force-dynamic";

interface ImportStatus {
  artistId: string;
  stage: 'initializing' | 'fetching-artist' | 'syncing-identifiers' | 'importing-songs' | 'importing-shows' | 'creating-setlists' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  details?: string;
  error?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number; // seconds
}

const cache = CacheClient.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  try {
    const { artistId } = params;
    
    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID is required" },
        { status: 400 }
      );
    }

    // Get import status from cache
    const statusKey = cacheKeys.syncProgress(artistId);
    const status = await cache.get<ImportStatus>(statusKey);

    if (!status) {
      return NextResponse.json(
        { 
          error: "Import status not found",
          artistId,
          message: "No import process found for this artist"
        },
        { status: 404 }
      );
    }

    // Calculate estimated time remaining based on stage and progress
    let estimatedTimeRemaining: number | undefined;
    if (status.stage !== 'completed' && status.stage !== 'failed') {
      const stageTimeEstimates = {
        'initializing': 5,
        'fetching-artist': 10,
        'syncing-identifiers': 15,
        'importing-songs': 30,
        'importing-shows': 20,
        'creating-setlists': 10,
      };
      
      const currentStageTime = stageTimeEstimates[status.stage] || 10;
      const remainingInStage = (100 - status.progress) / 100 * currentStageTime;
      estimatedTimeRemaining = Math.ceil(remainingInStage);
    }

    const response = {
      ...status,
      estimatedTimeRemaining,
      isCompleted: status.stage === 'completed',
      isFailed: status.stage === 'failed',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching import status:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch import status",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Helper function to update import status (used by import route)
export async function updateImportStatus(
  artistId: string,
  update: Partial<ImportStatus>
): Promise<void> {
  try {
    const statusKey = cacheKeys.syncProgress(artistId);
    const existingStatus = await cache.get<ImportStatus>(statusKey) || {
      artistId,
      stage: 'initializing' as const,
      progress: 0,
      message: 'Starting import...',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedStatus: ImportStatus = {
      ...existingStatus,
      ...update,
      updatedAt: new Date().toISOString(),
    };

    // Set TTL based on stage - completed/failed statuses expire after 1 hour
    const ttl = (updatedStatus.stage === 'completed' || updatedStatus.stage === 'failed') 
      ? 3600 // 1 hour
      : 1800; // 30 minutes for active imports

    await cache.set(statusKey, updatedStatus, { ex: ttl });
    
    console.log(`[IMPORT STATUS] ${artistId}: ${updatedStatus.stage} (${updatedStatus.progress}%) - ${updatedStatus.message}`);
  } catch (error) {
    console.error("Failed to update import status:", error);
  }
}