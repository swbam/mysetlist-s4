import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, reason, banType, banDays } = body;

    switch (action) {
      case "ban": {
        const bannedUntil = banType === "temporary" 
          ? addDays(new Date(), Number.parseInt(banDays)).toISOString()
          : null;

        // Create ban record
        const { error: banError } = await supabase.from("user_bans").insert({
          userId: userId,
          banned_by: user.id,
          reason,
          ban_type: banType,
          banned_until: bannedUntil,
        });

        if (banError) throw banError;

        // Update user record
        const { error: userError } = await supabase
          .from("users")
          .update({
            is_banned: true,
            ban_reason: reason,
            banned_until: bannedUntil,
          })
          .eq("id", userId);

        if (userError) throw userError;

        // Log action
        await supabase.from("moderation_logs").insert({
          moderator_id: user.id,
          action: "ban_user",
          target_type: "user",
          target_id: userId,
          reason,
          metadata: { ban_type: banType, ban_days: banType === "temporary" ? banDays : null },
        });

        break;
      }

      case "unban": {
        // Find and lift active ban
        const { data: activeBan } = await supabase
          .from("user_bans")
          .select("id")
          .eq("userId", userId)
          .is("lifted_at", null)
          .single();

        if (activeBan) {
          await supabase
            .from("user_bans")
            .update({
              lifted_at: new Date().toISOString(),
              lifted_by: user.id,
              lift_reason: "Manual unban by admin",
            })
            .eq("id", activeBan.id);
        }

        // Update user record
        await supabase
          .from("users")
          .update({
            is_banned: false,
            ban_reason: null,
            banned_until: null,
          })
          .eq("id", userId);

        // Log action
        await supabase.from("moderation_logs").insert({
          moderator_id: user.id,
          action: "unban_user",
          target_type: "user",
          target_id: userId,
          reason: "Manual unban",
        });

        break;
      }

      case "promote_moderator": {
        const { error } = await supabase
          .from("users")
          .update({ role: "moderator" })
          .eq("id", userId);

        if (error) throw error;

        // Log action
        await supabase.from("moderation_logs").insert({
          moderator_id: user.id,
          action: "change_role",
          target_type: "user",
          target_id: userId,
          reason: "Promoted to moderator",
          metadata: { old_role: "user", new_role: "moderator" },
        });

        break;
      }

      case "demote_user": {
        const { error } = await supabase
          .from("users")
          .update({ role: "user" })
          .eq("id", userId);

        if (error) throw error;

        // Log action
        await supabase.from("moderation_logs").insert({
          moderator_id: user.id,
          action: "change_role",
          target_type: "user",
          target_id: userId,
          reason: "Demoted to user",
          metadata: { old_role: "moderator", new_role: "user" },
        });

        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error performing user action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}