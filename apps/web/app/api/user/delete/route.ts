import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@repo/auth/server';
import { createServiceClient } from '@/lib/supabase/server';
import { db } from '@repo/database';
import { 
  users,
  userFollowsArtists,
  userShowAttendance,
  votes,
  showComments,
  venueReviews,
  emailPreferences,
  emailQueue,
  emailLogs,
  emailUnsubscribes
} from '@repo/database';
import { eq } from 'drizzle-orm';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify password or require recent authentication
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password confirmation required' },
        { status: 400 }
      );
    }

    // Verify password with Supabase
    const supabase = await createServiceClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (authError) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Delete all user data in the correct order (respecting foreign key constraints)
    try {
      // Start transaction
      await db.transaction(async (tx) => {
        // Delete votes
        await tx.delete(votes).where(eq(votes.userId, user.id));

        // Delete comments
        await tx.delete(showComments).where(eq(showComments.userId, user.id));

        // Delete venue reviews
        await tx.delete(venueReviews).where(eq(venueReviews.userId, user.id));

        // Delete show attendance
        await tx.delete(userShowAttendance).where(eq(userShowAttendance.userId, user.id));

        // Delete artist follows
        await tx.delete(userFollowsArtists).where(eq(userFollowsArtists.userId, user.id));

        // Delete email data
        await tx.delete(emailQueue).where(eq(emailQueue.userId, user.id));
        await tx.delete(emailLogs).where(eq(emailLogs.userId, user.id));
        await tx.delete(emailUnsubscribes).where(eq(emailUnsubscribes.userId, user.id));
        await tx.delete(emailPreferences).where(eq(emailPreferences.userId, user.id));

        // Finally, delete the user record
        await tx.delete(users).where(eq(users.id, user.id));
      });

      // Delete the Supabase auth user
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteAuthError) {
        console.error('Failed to delete auth user:', deleteAuthError);
        // User data is deleted, but auth record remains - log this for manual cleanup
      }

      // Sign out the user
      await supabase.auth.signOut();

      return NextResponse.json({
        success: true,
        message: 'Your account and all associated data has been permanently deleted.',
      });
    } catch (error) {
      console.error('Failed to delete user data:', error);
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Account deletion failed' },
      { status: 500 }
    );
  }
}