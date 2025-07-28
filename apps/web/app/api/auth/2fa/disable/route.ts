import { NextResponse } from "next/server"
import { authenticator } from "otplib"
import { createClient } from "~/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { code } = await request.json()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's 2FA secret
    const { data: settings, error: settingsError } = await supabase
      .from("user_security_settings")
      .select("two_factor_secret")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings?.two_factor_secret) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 })
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: settings.two_factor_secret,
    })

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      )
    }

    // Disable 2FA for the user
    await supabase
      .from("user_security_settings")
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("2FA disable error:", error)
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    )
  }
}
