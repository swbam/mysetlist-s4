import { NextResponse } from "next/server";
import { createAuthenticatedClient } from "~/lib/supabase/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Sign out with Supabase
    const supabase = await createAuthenticatedClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Successfully signed out" });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
