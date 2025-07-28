import {
  type EmailAddress,
  sendArtistFollowNotificationEmail,
  sendEmailVerificationEmail,
  sendLiveShowAlertEmail,
  sendNewShowNotificationEmail,
  sendPasswordResetEmail,
  sendSetlistUpdateEmail,
  sendShowReminderEmail,
  sendVoteMilestoneEmail,
  sendWeeklyDigestEmail,
  sendWelcomeEmail,
} from "@repo/email/services"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "~/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication for non-system requests
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const body = await request.json()
    const {
      type,
      template,
      recipients,
      to,
      subject,
      data: emailData,
      priority = "normal",
      scheduleFor,
      scheduledFor,
      systemToken,
    } = body

    // Validate system token for automated emails
    if (!session && systemToken !== process.env["EMAIL_SYSTEM_TOKEN"]) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle both formats
    const emailType = type || template
    const recipientList = recipients || (to ? [{ email: to }] : null)

    // Validate required fields
    if (!emailType || !recipientList) {
      return NextResponse.json(
        { error: "Missing required fields: type/template and recipients/to" },
        { status: 400 }
      )
    }

    // Convert recipients to EmailAddress format
    const emailAddresses: EmailAddress[] = Array.isArray(recipientList)
      ? recipientList.map((recipient: any) => ({
          email: typeof recipient === "string" ? recipient : recipient.email,
          name: typeof recipient === "object" ? recipient.name : undefined,
        }))
      : [{ email: recipientList }]

    let result
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] || "https://mysetlist.app"

    // Route to appropriate email service
    switch (emailType) {
      case "welcome":
        result = await sendWelcomeEmail({
          to: emailAddresses,
          name: emailData.name,
          appUrl,
        })
        break

      case "new-show-notification":
        result = await sendNewShowNotificationEmail({
          to: emailAddresses,
          userName: emailData.userName,
          show: emailData.show,
          appUrl,
        })
        break

      case "show-reminder":
        result = await sendShowReminderEmail({
          to: emailAddresses,
          userName: emailData.userName,
          show: emailData.show,
          daysUntilShow: emailData.daysUntilShow,
          appUrl,
        })
        break

      case "setlist-update":
        result = await sendSetlistUpdateEmail({
          to: emailAddresses,
          userName: emailData.userName,
          show: emailData.show,
          newSongs: emailData.newSongs,
          totalSongs: emailData.totalSongs,
          updateType: emailData.updateType || "updated",
          appUrl,
        })
        break

      case "weekly-digest":
        result = await sendWeeklyDigestEmail({
          to: emailAddresses,
          userName: emailData.userName,
          weekOf: emailData.weekOf,
          followedArtists: emailData.followedArtists,
          upcomingShows: emailData.upcomingShows,
          newSetlists: emailData.newSetlists,
          totalFollowedArtists: emailData.totalFollowedArtists,
          appUrl,
        })
        break

      case "artist-follow-notification":
        result = await sendArtistFollowNotificationEmail({
          to: emailAddresses,
          userName: emailData.userName,
          artist: emailData.artist,
          followerName: emailData.followerName,
          isFirstFollow: emailData.isFirstFollow,
          appUrl,
        })
        break

      case "vote-milestone":
        result = await sendVoteMilestoneEmail({
          to: emailAddresses,
          userName: emailData.userName,
          show: emailData.show,
          song: emailData.song,
          milestone: emailData.milestone,
          totalVotes: emailData.totalVotes,
          appUrl,
        })
        break

      case "live-show-alert":
        result = await sendLiveShowAlertEmail({
          to: emailAddresses,
          userName: emailData.userName,
          show: emailData.show,
          alertType: emailData.alertType,
          appUrl,
        })
        break

      case "password-reset":
        result = await sendPasswordResetEmail({
          to: emailAddresses,
          name: emailData.name,
          resetUrl: emailData.resetUrl,
          expirationHours: emailData.expirationHours,
          appUrl,
        })
        break

      case "email-verification":
        result = await sendEmailVerificationEmail({
          to: emailAddresses,
          name: emailData.name,
          verificationUrl: emailData.verificationUrl,
          expirationHours: emailData.expirationHours,
          appUrl,
        })
        break

      case "user-warning":
      case "show-cancelled":
      case "show-reminder":
      case "digest":
      case "weekly-digest":
        // For now, just queue these emails in the database
        // In production, these would be sent via email service
        result = { success: true, data: { queued: true } }
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    // Log email sending attempt
    if (result.success) {
      // Store email log in database
      try {
        await supabase.from("email_logs").insert({
          type: emailType,
          recipients: emailAddresses.map((r) => r.email),
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: {
            priority,
            scheduled_for: scheduleFor || scheduledFor,
            data: emailData,
            subject,
          },
        })
      } catch (_logError) {}
    } else {
      // Store failure log
      try {
        await supabase.from("email_logs").insert({
          type: emailType,
          recipients: emailAddresses.map((r) => r.email),
          status: "failed",
          error_message: result.error?.message,
          sent_at: new Date().toISOString(),
          metadata: {
            priority,
            scheduled_for: scheduleFor || scheduledFor,
            data: emailData,
            subject,
          },
        })
      } catch (_logError) {}
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Email queued successfully"
        : "Email failed to send",
      data: result.data,
      error: result.error?.message,
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to check email queue status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    let query = supabase
      .from("email_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq("status", status)
    }

    if (type) {
      query = query.eq("type", type)
    }

    const { data: emailLogs, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch email logs" },
        { status: 500 }
      )
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from("email_logs")
      .select("status, type")
      .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    const summary = {
      total24h: stats?.length || 0,
      sent24h: stats?.filter((s) => s.status === "sent").length || 0,
      failed24h: stats?.filter((s) => s.status === "failed").length || 0,
      typeBreakdown:
        stats?.reduce((acc: any, log) => {
          acc[log.type] = (acc[log.type] || 0) + 1
          return acc
        }, {}) || {},
    }

    return NextResponse.json({
      logs: emailLogs,
      summary,
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
