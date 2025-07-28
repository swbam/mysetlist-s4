import { NextResponse } from "next/server";
import { getCSRFToken } from "~/lib/csrf";

export async function GET() {
  try {
    const token = await getCSRFToken();

    return NextResponse.json({
      token,
      message: "CSRF token generated successfully",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 },
    );
  }
}
