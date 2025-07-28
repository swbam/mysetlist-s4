import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "~/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email, type = "all" } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user exists and get their preferences
    const { data: _ } = await supabase
      .from("user_email_preferences")
      .select("*")
      .eq("email", email)
      .single()

    let updateData
    if (type === "all") {
      updateData = {
        marketing_emails: false,
        vote_notifications: false,
        show_reminders: false,
        artist_updates: false,
        weekly_digest: false,
      }
    } else {
      updateData = { [type]: false }
    }

    // Update or insert preferences
    const { error: upsertError } = await supabase
      .from("user_email_preferences")
      .upsert({
        email,
        ...updateData,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const type = searchParams.get("type") || "all"

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Decode the token to get email
    const email = Buffer.from(token, "base64").toString("utf-8")

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current session if user is logged in
    const {
      data: { session },
    } = await supabase.auth.getSession()

    let updateData
    if (type === "all") {
      updateData = {
        marketing_emails: false,
        vote_notifications: false,
        show_reminders: false,
        artist_updates: false,
        weekly_digest: false,
      }
    } else {
      updateData = { [type]: false }
    }

    // Update or insert preferences
    const { error: upsertError } = await supabase
      .from("user_email_preferences")
      .upsert({
        email,
        user_id: session?.user?.id || null,
        ...updateData,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      )
    }

    // Log the unsubscribe action
    await supabase.from("email_unsubscribe_logs").insert({
      email,
      type,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
      created_at: new Date().toISOString(),
    })

    // Return HTML response for browser
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed - MySetlist</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
            .success { color: #16a34a; }
            .btn { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ Successfully Unsubscribed</h1>
          <p>You have been unsubscribed from ${type === "all" ? "all emails" : type} from MySetlist.</p>
          <p>You can update your email preferences anytime in your account settings.</p>
          <a href="/" class="btn">Return to MySetlist</a>
        </body>
      </html>
      `,
      {
        headers: {
          "Content-Type": "text/html",
        },
      }
    )
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
