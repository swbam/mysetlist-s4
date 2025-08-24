import { NextResponse } from "next/server";
import { initializeWorkers } from "~/lib/queues/workers";

export async function GET() {
  try {
    initializeWorkers();
    return NextResponse.json({ success: true, message: "Workers initialized" });
  } catch (error) {
    console.error("Failed to initialize workers:", error);
    return NextResponse.json(
      { error: "Failed to initialize workers" },
      { status: 500 }
    );
  }
}
