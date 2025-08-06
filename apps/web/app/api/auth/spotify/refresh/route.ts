import { NextResponse } from "next/server";
import { createAuthenticatedClient } from "~/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createAuthenticatedClient();

    // Refresh the session to get a new Spotify token
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Failed to refresh session" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      provider_token: data.session.provider_token,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
