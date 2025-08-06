import { type NextRequest, NextResponse } from "next/server";
import { createAuthenticatedClient } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, targetType, targetId } = await request.json();

    switch (action) {
      case "like":
        return handleLike(supabase, user.id, targetType, targetId);
      case "unlike":
        return handleUnlike(supabase, user.id, targetType, targetId);
      case "save":
        return handleSave(supabase, user.id, targetType, targetId);
      case "unsave":
        return handleUnsave(supabase, user.id, targetType, targetId);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process social action" },
      { status: 500 },
    );
  }
}

async function handleLike(
  supabase: any,
  userId: string,
  targetType: string,
  targetId: string,
) {
  // Check if already liked
  const { data: existing } = await supabase
    .from("user_likes")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .single();

  if (existing) {
    return NextResponse.json({ message: "Already liked" });
  }

  // Create like
  const { error } = await supabase.from("user_likes").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
  });

  if (error) {
    throw error;
  }

  return NextResponse.json({ success: true, liked: true });
}

async function handleUnlike(
  supabase: any,
  userId: string,
  targetType: string,
  targetId: string,
) {
  const { error } = await supabase
    .from("user_likes")
    .delete()
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) {
    throw error;
  }

  return NextResponse.json({ success: true, liked: false });
}

async function handleSave(
  supabase: any,
  userId: string,
  targetType: string,
  targetId: string,
) {
  // Check if already saved
  const { data: existing } = await supabase
    .from("user_saves")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .single();

  if (existing) {
    return NextResponse.json({ message: "Already saved" });
  }

  // Create save
  const { error } = await supabase.from("user_saves").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
  });

  if (error) {
    throw error;
  }

  return NextResponse.json({ success: true, saved: true });
}

async function handleUnsave(
  supabase: any,
  userId: string,
  targetType: string,
  targetId: string,
) {
  const { error } = await supabase
    .from("user_saves")
    .delete()
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) {
    throw error;
  }

  return NextResponse.json({ success: true, saved: false });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetType = searchParams.get("type");
    const targetIds = searchParams.get("ids")?.split(",") || [];

    if (!targetType || targetIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }

    // Get user's likes for the specified targets
    const { data: likes } = await supabase
      .from("user_likes")
      .select("target_id")
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .in("target_id", targetIds);

    // Get user's saves for the specified targets
    const { data: saves } = await supabase
      .from("user_saves")
      .select("target_id")
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .in("target_id", targetIds);

    const likedIds = new Set(likes?.map((l) => l.target_id) || []);
    const savedIds = new Set(saves?.map((s) => s.target_id) || []);

    const status = targetIds.reduce(
      (acc, id) => {
        acc[id] = {
          liked: likedIds.has(id),
          saved: savedIds.has(id),
        };
        return acc;
      },
      {} as Record<string, { liked: boolean; saved: boolean }>,
    );

    return NextResponse.json({ status });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch social status" },
      { status: 500 },
    );
  }
}
