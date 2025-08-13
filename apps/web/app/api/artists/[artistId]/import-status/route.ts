import { type NextRequest, NextResponse } from "next/server";
import { CacheClient, cacheKeys } from "~/lib/cache/redis";
import { updateImportStatus } from "~/lib/import-status";

export const dynamic = "force-dynamic";

export interface ImportStatus {
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
  context: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await context.params;
    
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

// updateImportStatus is now provided by ~/lib/import-status to avoid invalid exports on route files