import { NextRequest, NextResponse } from "next/server";
import { queueManager } from "~/lib/queues/queue-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Initialize all queue workers
    await queueManager.initialize();
    
    // Get current stats to verify initialization
    const stats = await queueManager.getAllQueueStats();
    
    return NextResponse.json({
      success: true,
      message: "All queue workers initialized successfully",
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Worker initialization failed:", error);
    
    return NextResponse.json({
      success: false,
      error: "Worker initialization failed",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current worker status
    const stats = await queueManager.getAllQueueStats();
    
    return NextResponse.json({
      success: true,
      message: "Worker status retrieved",
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Failed to get worker status:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to get worker status",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Shutdown all workers
    await queueManager.shutdown();
    
    return NextResponse.json({
      success: true,
      message: "All workers shut down successfully",
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Worker shutdown failed:", error);
    
    return NextResponse.json({
      success: false,
      error: "Worker shutdown failed",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}