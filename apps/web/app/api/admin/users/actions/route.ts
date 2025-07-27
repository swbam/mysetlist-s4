import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, userId, reason } = body;

    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result;
    let logAction = action;
    const logDetails: any = { target_user_id: userId };

    switch (action) {
      case 'ban': {
        // Ban user
        result = await supabase
          .from('users')
          .update({
            is_banned: true,
            ban_reason: reason || 'No reason provided',
            banned_at: new Date().toISOString(),
            banned_by: user.id,
          })
          .eq('id', userId);

        logDetails.reason = reason;
        break;
      }

      case 'unban':
        // Unban user
        result = await supabase
          .from('users')
          .update({
            is_banned: false,
            ban_reason: null,
            banned_at: null,
            banned_by: null,
          })
          .eq('id', userId);
        break;

      case 'warn': {
        // Issue warning to user
        const { data: currentUser } = await supabase
          .from('users')
          .select('warning_count')
          .eq('id', userId)
          .single();

        const newWarningCount = (currentUser?.warning_count || 0) + 1;

        result = await supabase
          .from('users')
          .update({
            warning_count: newWarningCount,
            last_warning_at: new Date().toISOString(),
            last_warning_by: user.id,
          })
          .eq('id', userId);

        logDetails.warning_count = newWarningCount;
        logDetails.reason = reason;
        break;
      }

      case 'promote_moderator': {
        // Promote user to moderator
        result = await supabase
          .from('users')
          .update({ role: 'moderator' })
          .eq('id', userId)
          .eq('role', 'user'); // Only promote regular users

        logAction = 'role_change';
        logDetails.old_role = 'user';
        logDetails.new_role = 'moderator';
        break;
      }

      case 'promote_admin': {
        // Promote user to admin (only super admins can do this)
        result = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('id', userId)
          .in('role', ['user', 'moderator']);

        logAction = 'role_change';
        logDetails.new_role = 'admin';
        break;
      }

      case 'demote_user': {
        // Demote moderator/admin to regular user
        const { data: targetUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        result = await supabase
          .from('users')
          .update({ role: 'user' })
          .eq('id', userId);

        logAction = 'role_change';
        logDetails.old_role = targetUser?.role;
        logDetails.new_role = 'user';
        break;
      }

      case 'verify_email':
        // Manually verify user's email
        result = await supabase
          .from('users')
          .update({
            email_confirmed_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;

      case 'reset_warnings':
        // Reset user's warning count
        result = await supabase
          .from('users')
          .update({
            warning_count: 0,
            last_warning_at: null,
            last_warning_by: null,
          })
          .eq('id', userId);
        break;

      case 'delete_account':
        // Soft delete user account
        result = await supabase
          .from('users')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
            delete_reason: reason,
          })
          .eq('id', userId);
        break;

      case 'restore_account':
        // Restore soft deleted account
        result = await supabase
          .from('users')
          .update({
            deleted_at: null,
            deleted_by: null,
            delete_reason: null,
          })
          .eq('id', userId);
        break;

      case 'send_notification':
        // Send notification to user
        result = await supabase.from('admin_notifications').insert({
          type: 'user_notification',
          title: body.title || 'Admin Message',
          message: body.message || reason,
          user_id: userId,
          sent_by: user.id,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (result?.error) {
      return NextResponse.json(
        { error: `Failed to ${action} user` },
        { status: 500 }
      );
    }

    // Log the moderation action
    await supabase.from('moderation_logs').insert({
      moderator_id: user.id,
      target_type: 'user',
      target_id: userId,
      action: logAction,
      reason: reason,
      details: logDetails,
    });

    // Log admin activity
    await supabase.from('user_activity_log').insert({
      user_id: user.id,
      action: `admin_${action}`,
      target_type: 'user',
      target_id: userId,
      details: logDetails,
    });

    return NextResponse.json({
      success: true,
      message: `User ${action} completed successfully`,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
