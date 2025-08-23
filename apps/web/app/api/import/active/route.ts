// MySetlist-S4 Active Imports API
// Provides information about currently running imports and statistics

import { NextRequest } from "next/server";
import { ImportStatusManager } from "~/lib/import-status";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('statsOnly') === 'true';
    const days = parseInt(searchParams.get('days') || '7');

    if (statsOnly) {
      // Return only statistics
      const stats = await ImportStatusManager.getImportStatistics(days);
      
      return Response.json({
        success: true,
        data: {
          statistics: stats,
        },
      });
    } else {
      // Return active imports and statistics
      const [activeImports, statistics] = await Promise.all([
        ImportStatusManager.getActiveImports(),
        ImportStatusManager.getImportStatistics(days),
      ]);

      return Response.json({
        success: true,
        data: {
          activeImports,
          statistics,
        },
      });
    }
  } catch (error) {
    console.error("Failed to fetch active imports:", error);
    
    return Response.json({
      success: false,
      error: "Failed to fetch active imports",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// POST endpoint to manually clean up completed imports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, olderThanHours = 24 } = body;

    if (action === 'cleanup') {
      const deletedCount = await ImportStatusManager.cleanupCompletedImports(olderThanHours);
      
      return Response.json({
        success: true,
        message: `Cleaned up ${deletedCount} completed import records`,
        deletedCount,
      });
    } else {
      return Response.json({
        success: false,
        error: "Invalid action",
        message: "Supported actions: cleanup",
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to process import action:", error);
    
    return Response.json({
      success: false,
      error: "Failed to process action",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}