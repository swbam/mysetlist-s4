import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUnsubscribeToken } from '@repo/email/services';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (!token && !type) {
      return NextResponse.json(
        { error: 'Missing token or type parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    let userId: string | undefined;
    let emailType: string | undefined;

    // If token provided, validate it
    if (token) {
      const tokenData = validateUnsubscribeToken(token);
      if (!tokenData) {
        return NextResponse.json(
          { error: 'Invalid or expired unsubscribe token' },
          { status: 400 }
        );
      }
      userId = tokenData.userId;
      emailType = tokenData.emailType;
    } else {
      // If no token, must be authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = session.user.id;
      emailType = type;
    }

    if (!userId || !emailType) {
      return NextResponse.json(
        { error: 'Missing user ID or email type' },
        { status: 400 }
      );
    }

    // Get current preferences
    const { data: preferences, error: fetchError } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to fetch user preferences:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user preferences' },
        { status: 500 }
      );
    }

    // Return current subscription status
    const currentPreferences = preferences || {
      user_id: userId,
      email_notifications: true,
      new_show_notifications: true,
      show_reminders: true,
      setlist_updates: true,
      weekly_digest: true,
      artist_follow_notifications: false,
      vote_milestones: true,
      live_show_alerts: true,
      marketing_emails: false,
      frequency: 'instant',
    };

    return NextResponse.json({
      userId,
      emailType,
      currentPreferences,
      isUnsubscribed: !currentPreferences[emailType as keyof typeof currentPreferences] || !currentPreferences.email_notifications,
    });

  } catch (error) {
    console.error('Unsubscribe GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, type, action, userId: providedUserId } = body;

    if (!token && !type && !providedUserId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    let userId: string | undefined;
    let emailType: string | undefined;

    // If token provided, validate it
    if (token) {
      const tokenData = validateUnsubscribeToken(token);
      if (!tokenData) {
        return NextResponse.json(
          { error: 'Invalid or expired unsubscribe token' },
          { status: 400 }
        );
      }
      userId = tokenData.userId;
      emailType = tokenData.emailType;
    } else {
      // If no token, must be authenticated user or provide userId for system calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user && !providedUserId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = session?.user?.id || providedUserId;
      emailType = type;
    }

    if (!userId || !emailType) {
      return NextResponse.json(
        { error: 'Missing user ID or email type' },
        { status: 400 }
      );
    }

    // Validate email type
    const validEmailTypes = [
      'email_notifications',
      'new_show_notifications', 
      'show_reminders',
      'setlist_updates',
      'weekly_digest',
      'artist_follow_notifications',
      'vote_milestones',
      'live_show_alerts',
      'marketing_emails',
    ];

    if (!validEmailTypes.includes(emailType)) {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }

    // Get current preferences or create default
    const { data: existingPreferences } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentPreferences = existingPreferences || {
      user_id: userId,
      email_notifications: true,
      new_show_notifications: true,
      show_reminders: true,
      setlist_updates: true,
      weekly_digest: true,
      artist_follow_notifications: false,
      vote_milestones: true,
      live_show_alerts: true,
      marketing_emails: false,
      frequency: 'instant',
    };

    // Update preferences based on action
    let updateData = { ...currentPreferences };

    if (action === 'unsubscribe' || !action) {
      // Unsubscribe from specific type
      updateData[emailType as keyof typeof updateData] = false;
      
      // If unsubscribing from master email_notifications, disable all
      if (emailType === 'email_notifications') {
        updateData = {
          ...updateData,
          email_notifications: false,
          new_show_notifications: false,
          show_reminders: false,
          setlist_updates: false,
          weekly_digest: false,
          artist_follow_notifications: false,
          vote_milestones: false,
          live_show_alerts: false,
          marketing_emails: false,
        };
      }
    } else if (action === 'resubscribe') {
      // Resubscribe to specific type
      updateData[emailType as keyof typeof updateData] = true;
      
      // If resubscribing to any type, enable master notifications
      if (emailType !== 'email_notifications') {
        updateData.email_notifications = true;
      }
    } else if (action === 'unsubscribe-all') {
      // Unsubscribe from everything
      updateData = {
        ...updateData,
        email_notifications: false,
        new_show_notifications: false,
        show_reminders: false,
        setlist_updates: false,
        weekly_digest: false,
        artist_follow_notifications: false,
        vote_milestones: false,
        live_show_alerts: false,
        marketing_emails: false,
      };
    }

    updateData.updated_at = new Date().toISOString();

    // Upsert preferences
    const { data: updatedPreferences, error } = await supabase
      .from('user_email_preferences')
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      console.error('Failed to update unsubscribe preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Log the unsubscribe action
    try {
      await supabase
        .from('email_unsubscribe_logs')
        .insert({
          user_id: userId,
          email_type: emailType,
          action: action || 'unsubscribe',
          unsubscribed_at: new Date().toISOString(),
          method: token ? 'email_link' : 'settings_page',
        });
    } catch (logError) {
      console.error('Failed to log unsubscribe action:', logError);
      // Don't fail the request if logging fails
    }

    const actionPast = action === 'resubscribe' ? 'resubscribed' : 'unsubscribed';
    const actionText = action === 'unsubscribe-all' ? 'all email notifications' : `${emailType.replace(/_/g, ' ')} notifications`;

    return NextResponse.json({
      success: true,
      message: `Successfully ${actionPast} from ${actionText}`,
      preferences: updatedPreferences,
      emailType,
      action: action || 'unsubscribe',
    });

  } catch (error) {
    console.error('Unsubscribe POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}