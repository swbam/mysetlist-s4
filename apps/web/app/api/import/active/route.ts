import { NextRequest, NextResponse } from "next/server";
import { getActiveImports } from "~/lib/import-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const activeImports = await getActiveImports();
    
    return NextResponse.json({
      success: true,
      imports: activeImports,
      count: activeImports.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Failed to get active imports:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to get active imports",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}