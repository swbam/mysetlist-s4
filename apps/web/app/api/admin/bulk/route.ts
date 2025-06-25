import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin or moderator
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!userData || (userData.role !== 'admin' && userData.role !== 'moderator')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { action, items, options } = await request.json();
    
    switch (action) {
      case 'approve_content':
        return await approveContent(supabase, items, user.id);
      
      case 'reject_content':
        return await rejectContent(supabase, items, options, user.id);
      
      case 'ban_users':
        return await banUsers(supabase, items, options, user.id);
      
      case 'verify_venues':
        return await verifyVenues(supabase, items, user.id);
      
      case 'update_show_status':
        return await updateShowStatus(supabase, items, options, user.id);
      
      case 'delete_content':
        return await deleteContent(supabase, items, options, user.id);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bulk admin operation error:', error);
    return NextResponse.json(
      { error: 'Operation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function approveContent(supabase: any, items: any[], userId: string) {
  const results = [];
  
  for (const item of items) {
    try {
      // Update moderation status based on content type
      const tableName = getTableName(item.type);
      await supabase
        .from(tableName)
        .update({
          moderation_status: 'approved',
          moderated_at: new Date().toISOString(),
          moderated_by: userId
        })
        .eq('id', item.id);
      
      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: 'approved',
        target_type: item.type,
        target_id: item.id,
        reason: 'Bulk approval'
      });
      
      results.push({ id: item.id, status: 'approved' });
    } catch (error) {
      results.push({ id: item.id, status: 'error', error: (error as Error).message });
    }
  }
  
  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter(r => r.status === 'approved').length} items approved`
  });
}

async function rejectContent(supabase: any, items: any[], options: any, userId: string) {
  const { reason } = options;
  const results = [];
  
  for (const item of items) {
    try {
      const tableName = getTableName(item.type);
      await supabase
        .from(tableName)
        .update({
          moderation_status: 'rejected',
          moderated_at: new Date().toISOString(),
          moderated_by: userId,
          rejection_reason: reason
        })
        .eq('id', item.id);
      
      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: 'rejected',
        target_type: item.type,
        target_id: item.id,
        reason: reason || 'Bulk rejection'
      });
      
      results.push({ id: item.id, status: 'rejected' });
    } catch (error) {
      results.push({ id: item.id, status: 'error', error: (error as Error).message });
    }
  }
  
  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter(r => r.status === 'rejected').length} items rejected`
  });
}

async function banUsers(supabase: any, items: any[], options: any, userId: string) {
  const { reason, duration_days } = options;
  const results = [];
  
  for (const item of items) {
    try {
      // Create user ban record
      const banExpiry = duration_days 
        ? new Date(Date.now() + (duration_days * 24 * 60 * 60 * 1000)).toISOString()
        : null;
      
      await supabase
        .from('user_bans')
        .insert({
          user_id: item.user_id,
          banned_by: userId,
          reason: reason || 'Bulk ban action',
          expires_at: banExpiry
        });
      
      // Update user warning count
      await supabase.rpc('increment_user_warnings', {
        target_user_id: item.user_id
      });
      
      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: 'banned_user',
        target_type: 'user',
        target_id: item.user_id,
        reason: reason || 'Bulk ban action'
      });
      
      results.push({ id: item.user_id, status: 'banned' });
    } catch (error) {
      results.push({ id: item.user_id, status: 'error', error: (error as Error).message });
    }
  }
  
  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter(r => r.status === 'banned').length} users banned`
  });
}

async function verifyVenues(supabase: any, items: any[], userId: string) {
  const results = [];
  
  for (const item of items) {
    try {
      await supabase
        .from('venues')
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
          verified_by: userId
        })
        .eq('id', item.id);
      
      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: 'verified_venue',
        target_type: 'venue',
        target_id: item.id,
        reason: 'Bulk venue verification'
      });
      
      results.push({ id: item.id, status: 'verified' });
    } catch (error) {
      results.push({ id: item.id, status: 'error', error: (error as Error).message });
    }
  }
  
  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter(r => r.status === 'verified').length} venues verified`
  });
}

async function updateShowStatus(supabase: any, items: any[], options: any, userId: string) {
  const { status } = options;
  const results = [];
  
  for (const item of items) {
    try {
      await supabase
        .from('shows')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      
      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: 'updated_show_status',
        target_type: 'show',
        target_id: item.id,
        reason: `Updated status to ${status}`
      });
      
      results.push({ id: item.id, status: 'updated' });
    } catch (error) {
      results.push({ id: item.id, status: 'error', error: (error as Error).message });
    }
  }
  
  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter(r => r.status === 'updated').length} shows updated`
  });
}

async function deleteContent(supabase: any, items: any[], options: any, userId: string) {
  const { hard_delete = false } = options;
  const results = [];
  
  for (const item of items) {
    try {
      const tableName = getTableName(item.type);
      
      if (hard_delete) {
        // Permanently delete the record
        await supabase
          .from(tableName)
          .delete()
          .eq('id', item.id);
      } else {
        // Soft delete by updating deleted_at timestamp
        await supabase
          .from(tableName)
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: userId
          })
          .eq('id', item.id);
      }
      
      // Log moderation action
      await logModerationAction(supabase, {
        moderator_id: userId,
        action: hard_delete ? 'hard_deleted' : 'soft_deleted',
        target_type: item.type,
        target_id: item.id,
        reason: `Bulk ${hard_delete ? 'hard' : 'soft'} delete`
      });
      
      results.push({ id: item.id, status: 'deleted' });
    } catch (error) {
      results.push({ id: item.id, status: 'error', error: (error as Error).message });
    }
  }
  
  return NextResponse.json({
    success: true,
    results,
    message: `${results.filter(r => r.status === 'deleted').length} items deleted`
  });
}

function getTableName(contentType: string): string {
  switch (contentType) {
    case 'setlist':
      return 'setlists';
    case 'review':
      return 'venue_reviews';
    case 'photo':
      return 'venue_photos';
    case 'tip':
      return 'venue_insider_tips';
    case 'user':
      return 'users';
    case 'venue':
      return 'venues';
    case 'show':
      return 'shows';
    case 'artist':
      return 'artists';
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }
}

async function logModerationAction(supabase: any, action: {
  moderator_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
}) {
  await supabase
    .from('moderation_logs')
    .insert({
      moderator_id: action.moderator_id,
      action: action.action,
      target_type: action.target_type,
      target_id: action.target_id,
      reason: action.reason,
      created_at: new Date().toISOString()
    });
}