import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { createClient } from "~/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { code, secret } = await request.json();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: secret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    // Enable 2FA for the user
    await supabase.from("user_security_settings").upsert({
      user_id: user.id,
      two_factor_enabled: true,
      two_factor_secret: secret,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 },
    );
  }
}
