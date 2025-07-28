import { getUser } from "@repo/auth/server";
import { db } from "@repo/database";
import {
  emailLogs,
  emailPreferences,
  emailQueue,
  emailUnsubscribes,
  users,
  venueReviews,
  votes,
} from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify password or require recent authentication
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password confirmation required" },
        { status: 400 },
      );
    }

    // Verify password with Supabase
    const supabase = createServiceClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Delete all user data in the correct order (respecting foreign key constraints)
    try {
      // Start transaction
      await db.transaction(async (tx) => {
        // Delete votes
        await tx.delete(votes).where(eq(votes.userId, user.id));

        // Delete venue reviews
        await tx.delete(venueReviews).where(eq(venueReviews.userId, user.id));

        // Delete email data
        await tx.delete(emailQueue).where(eq(emailQueue.userId, user.id));
        await tx.delete(emailLogs).where(eq(emailLogs.userId, user.id));
        await tx
          .delete(emailUnsubscribes)
          .where(eq(emailUnsubscribes.userId, user.id));
        await tx
          .delete(emailPreferences)
          .where(eq(emailPreferences.userId, user.id));

        // Finally, delete the user record
        await tx.delete(users).where(eq(users.id, user.id));
      });

      // Delete the Supabase auth user
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
        user.id,
      );

      if (deleteAuthError) {
        // User data is deleted, but auth record remains - log this for manual cleanup
      }

      // Sign out the user
      await supabase.auth.signOut();

      return NextResponse.json({
        success: true,
        message:
          "Your account and all associated data has been permanently deleted.",
      });
    } catch (_error) {
      return NextResponse.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 },
      );
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Account deletion failed" },
      { status: 500 },
    );
  }
}
