import { NextRequest, NextResponse } from "next/server";
import { queueManager } from "~/lib/queues/queue-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Initialize queue manager if not already done
    await queueManager.initialize();
    
    // Get stats for all queues
    const stats = await queueManager.getAllQueueStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Failed to get queue stats:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to get queue statistics",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}