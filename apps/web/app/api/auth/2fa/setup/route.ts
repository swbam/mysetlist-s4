import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { createClient } from "~/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauth = authenticator.keyuri(user.email || "", "MySetlist", secret);

    const qrCode = await qrcode.toDataURL(otpauth);

    // Store the secret temporarily (you might want to use a more secure method)
    // For production, consider storing this encrypted in the database
    await supabase.from("user_security_settings").upsert({
      user_id: user.id,
      two_factor_secret: secret,
      two_factor_enabled: false,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      qrCode,
      secret,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 });
  }
}
