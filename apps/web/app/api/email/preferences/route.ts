import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export interface EmailPreferences {
  id?: string;
  user_id: string;
  email_notifications: boolean;
  new_show_notifications: boolean;
  show_reminders: boolean;
  setlist_updates: boolean;
  weekly_digest: boolean;
  artist_follow_notifications: boolean;
  vote_milestones: boolean;
  live_show_alerts: boolean;
  marketing_emails: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  updated_at?: string;
}

// GET user's email preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: preferences, error } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch email preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      const defaultPreferences: Omit<EmailPreferences, 'id' | 'updated_at'> = {
        user_id: session.user.id,
        email_notifications: true,
        new_show_notifications: true,
        show_reminders: true,
        setlist_updates: true,
        weekly_digest: true,
        artist_follow_notifications: false, // Only for artists
        vote_milestones: true,
        live_show_alerts: true,
        marketing_emails: false,
        frequency: 'instant',
      };

      return NextResponse.json(defaultPreferences);
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Email preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE user's email preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const allowedFields = [
      'email_notifications',
      'new_show_notifications',
      'show_reminders',
      'setlist_updates',
      'weekly_digest',
      'artist_follow_notifications',
      'vote_milestones',
      'live_show_alerts',
      'marketing_emails',
      'frequency',
    ];

    const updateData: Partial<EmailPreferences> = {
      user_id: session.user.id,
      updated_at: new Date().toISOString(),
    };

    // Only include allowed fields
    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key as keyof EmailPreferences] = body[key];
      }
    });

    // Validate frequency if provided
    if (
      updateData.frequency &&
      !['instant', 'daily', 'weekly'].includes(updateData.frequency)
    ) {
      return NextResponse.json(
        { error: 'Invalid frequency value' },
        { status: 400 }
      );
    }

    // Check if preferences exist
    const { data: existingPreferences } = await supabase
      .from('user_email_preferences')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    let result;
    if (existingPreferences) {
      // Update existing preferences
      result = await supabase
        .from('user_email_preferences')
        .update(updateData)
        .eq('user_id', session.user.id)
        .select()
        .single();
    } else {
      // Insert new preferences
      result = await supabase
        .from('user_email_preferences')
        .insert(updateData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Failed to update email preferences:', result.error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Preferences updated successfully',
      preferences: result.data,
    });
  } catch (error) {
    console.error('Email preferences PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to bulk update preferences (for onboarding)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences, action } = body;

    if (action === 'reset') {
      // Reset to defaults
      const defaultPreferences: Omit<EmailPreferences, 'id' | 'updated_at'> = {
        user_id: session.user.id,
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

      const { data, error } = await supabase
        .from('user_email_preferences')
        .upsert({
          ...defaultPreferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to reset email preferences:', error);
        return NextResponse.json(
          { error: 'Failed to reset preferences' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Preferences reset to defaults',
        preferences: data,
      });
    }

    if (action === 'disable-all') {
      // Disable all email notifications
      const disabledPreferences = {
        user_id: session.user.id,
        email_notifications: false,
        new_show_notifications: false,
        show_reminders: false,
        setlist_updates: false,
        weekly_digest: false,
        artist_follow_notifications: false,
        vote_milestones: false,
        live_show_alerts: false,
        marketing_emails: false,
        frequency: 'instant',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_email_preferences')
        .upsert(disabledPreferences)
        .select()
        .single();

      if (error) {
        console.error('Failed to disable email preferences:', error);
        return NextResponse.json(
          { error: 'Failed to disable preferences' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'All email notifications disabled',
        preferences: data,
      });
    }

    // Regular bulk update
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences data' },
        { status: 400 }
      );
    }

    const updateData = {
      ...preferences,
      user_id: session.user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_email_preferences')
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      console.error('Failed to update email preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Preferences updated successfully',
      preferences: data,
    });
  } catch (error) {
    console.error('Email preferences POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
