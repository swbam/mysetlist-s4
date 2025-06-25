import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'new_show' | 'show_reminder' | 'artist_update';
  artistId?: string;
  showId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, artistId, showId } = await req.json() as NotificationRequest;

    let emailsSent = 0;

    switch (type) {
      case 'new_show':
        emailsSent = await sendNewShowNotifications(supabase, resendApiKey, artistId);
        break;
      case 'show_reminder':
        emailsSent = await sendShowReminders(supabase, resendApiKey, showId);
        break;
      case 'artist_update':
        emailsSent = await sendArtistUpdateNotifications(supabase, resendApiKey, artistId);
        break;
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNewShowNotifications(supabase: any, resendKey: string, artistId?: string) {
  // Get users who follow the artist and have notifications enabled
  const query = supabase
    .from('user_follows_artists')
    .select(`
      user_id,
      users!inner(
        email,
        email_preferences!inner(
          show_notifications
        )
      ),
      artists!inner(
        name,
        slug
      )
    `)
    .eq('users.email_preferences.show_notifications', true);

  if (artistId) {
    query.eq('artist_id', artistId);
  }

  const { data: followers, error } = await query;

  if (error) throw error;

  let emailsSent = 0;

  for (const follower of followers || []) {
    const emailBody = {
      from: 'MySetlist <notifications@mysetlist.app>',
      to: follower.users.email,
      subject: `New show announced: ${follower.artists.name}`,
      html: `
        <h2>New Show Announced!</h2>
        <p>${follower.artists.name} just announced a new show.</p>
        <p><a href="https://mysetlist.app/artists/${follower.artists.slug}">View all shows</a></p>
        <hr>
        <p><small>You're receiving this because you follow ${follower.artists.name}. 
        <a href="https://mysetlist.app/settings/notifications">Update your notification preferences</a></small></p>
      `,
    };

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody),
      });

      if (response.ok) {
        emailsSent++;
      }
    } catch (error) {
      console.error(`Failed to send email to ${follower.users.email}:`, error);
    }
  }

  return emailsSent;
}

async function sendShowReminders(supabase: any, resendKey: string, showId?: string) {
  // Get shows happening in the next 24 hours
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();

  const query = supabase
    .from('show_attendees')
    .select(`
      user_id,
      users!inner(
        email,
        email_preferences!inner(
          show_reminders
        )
      ),
      shows!inner(
        id,
        show_date,
        artists!inner(name),
        venues!inner(name, city)
      )
    `)
    .eq('users.email_preferences.show_reminders', true)
    .gte('shows.show_date', today)
    .lte('shows.show_date', tomorrow);

  if (showId) {
    query.eq('show_id', showId);
  }

  const { data: attendees, error } = await query;

  if (error) throw error;

  let emailsSent = 0;

  for (const attendee of attendees || []) {
    const showDate = new Date(attendee.shows.show_date);
    const emailBody = {
      from: 'MySetlist <notifications@mysetlist.app>',
      to: attendee.users.email,
      subject: `Reminder: ${attendee.shows.artists.name} tomorrow!`,
      html: `
        <h2>Show Reminder</h2>
        <p>Don't forget! ${attendee.shows.artists.name} is performing tomorrow.</p>
        <p><strong>When:</strong> ${showDate.toLocaleDateString()} at ${showDate.toLocaleTimeString()}</p>
        <p><strong>Where:</strong> ${attendee.shows.venues.name}, ${attendee.shows.venues.city}</p>
        <p><a href="https://mysetlist.app/shows/${attendee.shows.id}">View show details</a></p>
        <hr>
        <p><small><a href="https://mysetlist.app/settings/notifications">Update your notification preferences</a></small></p>
      `,
    };

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody),
      });

      if (response.ok) {
        emailsSent++;
      }
    } catch (error) {
      console.error(`Failed to send reminder to ${attendee.users.email}:`, error);
    }
  }

  return emailsSent;
}

async function sendArtistUpdateNotifications(supabase: any, resendKey: string, artistId?: string) {
  // Similar to new show notifications but for general artist updates
  return sendNewShowNotifications(supabase, resendKey, artistId);
}