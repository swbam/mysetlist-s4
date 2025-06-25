import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This API allows triggering specific email notifications based on events
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { event, data, systemToken } = body;

    // Validate system token for automated triggers
    if (systemToken !== process.env.EMAIL_SYSTEM_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!event || !data) {
      return NextResponse.json(
        { error: 'Missing event or data' },
        { status: 400 }
      );
    }

    let emailQueue = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mysetlist.app';

    switch (event) {
      case 'user.welcome':
        {
          const { userId, name, email } = data;
          
          emailQueue.push({
            type: 'welcome',
            recipients: [{ email, name }],
            data: { name },
            priority: 'high',
          });
        }
        break;

      case 'show.announced':
        {
          const { showId, artistId, artistName } = data;
          
          // Get followers of the artist who want new show notifications
          const { data: followers } = await supabase
            .from('artist_followers')
            .select(`
              user_id,
              users!inner (
                email,
                full_name,
                user_email_preferences (
                  new_show_notifications,
                  email_notifications
                )
              )
            `)
            .eq('artist_id', artistId);

          // Get show details
          const { data: show } = await supabase
            .from('shows')
            .select(`
              *,
              venues (name, city, country),
              artists (name)
            `)
            .eq('id', showId)
            .single();

          if (show && followers) {
            const notificationRecipients = followers
              .filter(follower => {
                const prefs = follower.users.user_email_preferences[0];
                return prefs?.email_notifications && prefs?.new_show_notifications;
              })
              .map(follower => ({
                email: follower.users.email,
                name: follower.users.full_name,
              }));

            if (notificationRecipients.length > 0) {
              emailQueue.push({
                type: 'new-show-notification',
                recipients: notificationRecipients,
                data: {
                  userName: '', // Will be personalized per recipient
                  show: {
                    id: show.id,
                    name: show.name,
                    artistName: show.artists.name,
                    venue: show.venues.name,
                    date: new Date(show.date).toLocaleDateString(),
                    time: show.time,
                    ticketUrl: show.ticket_url,
                    announcedAt: new Date().toLocaleDateString(),
                  },
                },
                priority: 'high',
              });
            }
          }
        }
        break;

      case 'setlist.updated':
        {
          const { showId, newSongs, updateType } = data;
          
          // Get users who are following this show or artist
          const { data: show } = await supabase
            .from('shows')
            .select(`
              *,
              venues (name),
              artists (name, id),
              show_attendees!inner (
                user_id,
                users!inner (
                  email,
                  full_name,
                  user_email_preferences (
                    setlist_updates,
                    email_notifications
                  )
                )
              )
            `)
            .eq('id', showId)
            .single();

          if (show) {
            const recipients = show.show_attendees
              .filter(attendee => {
                const prefs = attendee.users.user_email_preferences[0];
                return prefs?.email_notifications && prefs?.setlist_updates;
              })
              .map(attendee => ({
                email: attendee.users.email,
                name: attendee.users.full_name,
              }));

            if (recipients.length > 0) {
              emailQueue.push({
                type: 'setlist-update',
                recipients,
                data: {
                  userName: '', // Will be personalized per recipient
                  show: {
                    id: show.id,
                    name: show.name,
                    artistName: show.artists.name,
                    venue: show.venues.name,
                    date: new Date(show.date).toLocaleDateString(),
                  },
                  newSongs,
                  totalSongs: newSongs.length,
                  updateType,
                },
                priority: 'medium',
              });
            }
          }
        }
        break;

      case 'show.starting':
        {
          const { showId, alertType } = data;
          
          const { data: show } = await supabase
            .from('shows')
            .select(`
              *,
              venues (name),
              artists (name),
              show_attendees!inner (
                user_id,
                users!inner (
                  email,
                  full_name,
                  user_email_preferences (
                    live_show_alerts,
                    email_notifications
                  )
                )
              )
            `)
            .eq('id', showId)
            .single();

          if (show) {
            const recipients = show.show_attendees
              .filter(attendee => {
                const prefs = attendee.users.user_email_preferences[0];
                return prefs?.email_notifications && prefs?.live_show_alerts;
              })
              .map(attendee => ({
                email: attendee.users.email,
                name: attendee.users.full_name,
              }));

            if (recipients.length > 0) {
              emailQueue.push({
                type: 'live-show-alert',
                recipients,
                data: {
                  userName: '', // Will be personalized per recipient
                  show: {
                    id: show.id,
                    name: show.name,
                    artistName: show.artists.name,
                    venue: show.venues.name,
                    date: new Date(show.date).toLocaleDateString(),
                    time: show.time,
                    setlistStatus: 'live',
                    estimatedDuration: '2 hours',
                  },
                  alertType,
                },
                priority: 'high',
              });
            }
          }
        }
        break;

      case 'vote.milestone':
        {
          const { songId, showId, milestone, userId } = data;
          
          // Get user details and song/show info
          const { data: user } = await supabase
            .from('users')
            .select(`
              email,
              full_name,
              user_email_preferences (
                vote_milestones,
                email_notifications
              )
            `)
            .eq('id', userId)
            .single();

          const { data: song } = await supabase
            .from('setlist_songs')
            .select(`
              *,
              songs (title, artist),
              setlists!inner (
                shows!inner (
                  id,
                  name,
                  date,
                  artists (name),
                  venues (name)
                )
              )
            `)
            .eq('id', songId)
            .single();

          if (user && song && user.user_email_preferences[0]?.email_notifications && user.user_email_preferences[0]?.vote_milestones) {
            const show = song.setlists.shows;
            
            emailQueue.push({
              type: 'vote-milestone',
              recipients: [{ email: user.email, name: user.full_name }],
              data: {
                userName: user.full_name,
                show: {
                  id: show.id,
                  name: show.name,
                  artistName: show.artists.name,
                  venue: show.venues.name,
                  date: new Date(show.date).toLocaleDateString(),
                },
                song: {
                  title: song.songs.title,
                  artist: song.songs.artist,
                  votes: song.vote_count || 0,
                  position: song.position || 1,
                },
                milestone,
                totalVotes: 0, // Would need to calculate from related data
              },
              priority: 'low',
            });
          }
        }
        break;

      case 'artist.new_follower':
        {
          const { artistId, followerId, isFirstFollow } = data;
          
          // Get artist owner/manager details
          const { data: artist } = await supabase
            .from('artists')
            .select(`
              *,
              artist_managers!inner (
                user_id,
                users!inner (
                  email,
                  full_name,
                  user_email_preferences (
                    artist_follow_notifications,
                    email_notifications
                  )
                )
              )
            `)
            .eq('id', artistId)
            .single();

          const { data: follower } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', followerId)
            .single();

          if (artist && follower) {
            const managers = artist.artist_managers
              .filter(manager => {
                const prefs = manager.users.user_email_preferences[0];
                return prefs?.email_notifications && prefs?.artist_follow_notifications;
              })
              .map(manager => ({
                email: manager.users.email,
                name: manager.users.full_name,
              }));

            if (managers.length > 0) {
              emailQueue.push({
                type: 'artist-follow-notification',
                recipients: managers,
                data: {
                  userName: '', // Will be personalized per recipient
                  artist: {
                    id: artist.id,
                    name: artist.name,
                    genre: artist.genres?.[0],
                    upcomingShows: 0, // Would need to calculate
                    recentActivity: 'Active on MySetlist',
                  },
                  followerName: follower.full_name || follower.email,
                  isFirstFollow,
                },
                priority: 'low',
              });
            }
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${event}` },
          { status: 400 }
        );
    }

    // Send all queued emails
    const results = [];
    for (const emailData of emailQueue) {
      try {
        // Personalize emails for each recipient
        if (emailData.type === 'new-show-notification' && emailData.recipients.length > 1) {
          // Send individual emails for personalization
          for (const recipient of emailData.recipients) {
            const personalizedData = {
              ...emailData.data,
              userName: recipient.name || recipient.email.split('@')[0],
            };

            const response = await fetch(`${request.nextUrl.origin}/api/email/queue`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...emailData,
                recipients: [recipient],
                data: personalizedData,
                systemToken: process.env.EMAIL_SYSTEM_TOKEN,
              }),
            });

            const result = await response.json();
            results.push({
              recipient: recipient.email,
              type: emailData.type,
              success: result.success,
              error: result.error,
            });
          }
        } else {
          // Send as batch
          const response = await fetch(`${request.nextUrl.origin}/api/email/queue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...emailData,
              systemToken: process.env.EMAIL_SYSTEM_TOKEN,
            }),
          });

          const result = await response.json();
          results.push({
            type: emailData.type,
            recipientCount: emailData.recipients.length,
            success: result.success,
            error: result.error,
          });
        }
      } catch (error) {
        console.error(`Failed to send ${emailData.type} email:`, error);
        results.push({
          type: emailData.type,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      event,
      triggeredEmails: emailQueue.length,
      results,
    });

  } catch (error) {
    console.error('Email trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}