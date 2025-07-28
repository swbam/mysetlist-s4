import { type NextRequest, NextResponse } from "next/server";
import { trackView } from "~/lib/analytics/track-views";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id } = body;

    // Validate input
    if (!type || !id) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    if (!["artist", "show", "venue"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type parameter" },
        { status: 400 },
      );
    }

    // Track the view
    await trackView(type, id);

    return NextResponse.json({
      success: true,
      tracked: { type, id },
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 },
    );
  }
}
