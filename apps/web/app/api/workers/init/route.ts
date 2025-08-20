import { type NextRequest, NextResponse } from "next/server";
import { initializeWorkers, setupRecurringJobs } from "~/lib/queues/workers";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Track initialization status
let isInitialized = false;
let initializationPromise: Promise<any> | null = null;

/**
 * GET /api/workers/init - Initialize BullMQ workers
 * This should be called once when the application starts
 */
export async function GET(request: NextRequest) {
  try {
    // Check if already initialized
    if (isInitialized) {
      return NextResponse.json({
        success: true,
        message: "Workers already initialized",
        initialized: true,
      });
    }

    // Check if initialization is in progress
    if (initializationPromise) {
      await initializationPromise;
      return NextResponse.json({
        success: true,
        message: "Workers initialized (was in progress)",
        initialized: true,
      });
    }

    // Start initialization
    initializationPromise = initializeWorkers();
    const workers = await initializationPromise;

    // Setup recurring jobs
    await setupRecurringJobs();

    isInitialized = true;
    initializationPromise = null;

    return NextResponse.json({
      success: true,
      message: "Workers initialized successfully",
      workerCount: workers.size,
      initialized: true,
    });
  } catch (error) {
    console.error("Failed to initialize workers:", error);
    initializationPromise = null;

    return NextResponse.json(
      {
        error: "Failed to initialize workers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/workers/init - Force re-initialization of workers
 * Use with caution - this will restart all workers
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Close existing workers if initialized
    if (isInitialized) {
      const { queueManager } = await import("~/lib/queues/workers");
      await queueManager.closeAll();
      isInitialized = false;
    }

    // Re-initialize
    const workers = await initializeWorkers();
    await setupRecurringJobs();

    isInitialized = true;

    return NextResponse.json({
      success: true,
      message: "Workers re-initialized successfully",
      workerCount: workers.size,
    });
  } catch (error) {
    console.error("Failed to re-initialize workers:", error);

    return NextResponse.json(
      {
        error: "Failed to re-initialize workers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
