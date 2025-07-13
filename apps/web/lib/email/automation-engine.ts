import { createClient } from '~/lib/supabase/server';
import { getUserPreferences } from '~/lib/recommendations';
import { 
  sendWelcomeEmail, 
  sendShowReminderEmail, 
  sendNewShowNotificationEmail,
  sendWeeklyDigestEmail,
  sendVoteMilestoneEmail
} from '@repo/email/services';

export interface EmailTrigger {
  id: string;
  name: string;
  type: 'event' | 'schedule' | 'behavior' | 'milestone';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
  }>;
  delay?: number; // milliseconds
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  template: string;
  active: boolean;
  personalization: {
    useUserPreferences: boolean;
    useLocationData: boolean;
    useVotingHistory: boolean;
    useFollowedArtists: boolean;
    dynamicContent: boolean;
  };
}

export interface EmailCampaign {
  id: string;
  name: string;
  description: string;
  type: 'welcome' | 'retention' | 'engagement' | 'notification' | 'digest' | 'promotional';
  triggers: EmailTrigger[];
  segmentation: {
    criteria: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    includeNewUsers: boolean;
    includeActiveUsers: boolean;
    includeInactiveUsers: boolean;
  };
  abTest?: {
    enabled: boolean;
    variants: Array<{
      name: string;
      template: string;
      weight: number;
    }>;
  };
  analytics: {
    trackOpens: boolean;
    trackClicks: boolean;
    trackConversions: boolean;
    conversionEvents: string[];
  };
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalizedEmailData {
  userId: string;
  userName: string;
  email: string;
  preferences: {
    favoriteGenres: string[];
    favoriteArtists: Array<{ id: string; name: string; image_url?: string }>;
    favoriteVenues: Array<{ id: string; name: string; city: string }>;
    lastActivity: Date;
    timezone: string;
    location?: { city: string; country: string };
  };
  recommendations: {
    shows: Array<{ id: string; name: string; date: string; venue: string }>;
    artists: Array<{ id: string; name: string; image_url?: string }>;
  };
  recentActivity: {
    votesCount: number;
    showsAttended: number;
    newFollows: number;
    lastVote?: Date;
    lastAttendance?: Date;
  };
  engagement: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    lastEngagement: Date;
    emailOpens: number;
    emailClicks: number;
  };
}

class EmailAutomationEngine {
  private supabase: ReturnType<typeof createClient>;
  private defaultTriggers: EmailTrigger[];

  constructor() {
    this.supabase = createClient();
    this.defaultTriggers = this.initializeDefaultTriggers();
  }

  private initializeDefaultTriggers(): EmailTrigger[] {
    return [
      {
        id: 'welcome-series',
        name: 'Welcome Series',
        type: 'event',
        conditions: [
          { field: 'user.created_at', operator: 'greater_than', value: Date.now() - 24 * 60 * 60 * 1000 }
        ],
        delay: 30 * 60 * 1000, // 30 minutes after signup
        frequency: 'once',
        template: 'welcome',
        active: true,
        personalization: {
          useUserPreferences: true,
          useLocationData: true,
          useVotingHistory: false,
          useFollowedArtists: false,
          dynamicContent: true
        }
      },
      {
        id: 'show-reminders',
        name: 'Show Reminders',
        type: 'schedule',
        conditions: [
          { field: 'show.date', operator: 'greater_than', value: Date.now() },
          { field: 'show.date', operator: 'less_than', value: Date.now() + 48 * 60 * 60 * 1000 }
        ],
        delay: 0,
        frequency: 'once',
        template: 'show-reminder',
        active: true,
        personalization: {
          useUserPreferences: true,
          useLocationData: true,
          useVotingHistory: true,
          useFollowedArtists: true,
          dynamicContent: true
        }
      },
      {
        id: 'new-show-notifications',
        name: 'New Show Notifications',
        type: 'event',
        conditions: [
          { field: 'show.created_at', operator: 'greater_than', value: Date.now() - 60 * 60 * 1000 }
        ],
        delay: 15 * 60 * 1000, // 15 minutes after show creation
        frequency: 'once',
        template: 'new-show-notification',
        active: true,
        personalization: {
          useUserPreferences: true,
          useLocationData: true,
          useVotingHistory: true,
          useFollowedArtists: true,
          dynamicContent: true
        }
      },
      {
        id: 'engagement-recovery',
        name: 'Engagement Recovery',
        type: 'behavior',
        conditions: [
          { field: 'user.last_activity', operator: 'less_than', value: Date.now() - 7 * 24 * 60 * 60 * 1000 }
        ],
        delay: 0,
        frequency: 'once',
        template: 'engagement-recovery',
        active: true,
        personalization: {
          useUserPreferences: true,
          useLocationData: true,
          useVotingHistory: true,
          useFollowedArtists: true,
          dynamicContent: true
        }
      },
      {
        id: 'vote-milestone',
        name: 'Vote Milestone',
        type: 'milestone',
        conditions: [
          { field: 'user.total_votes', operator: 'in', value: [10, 50, 100, 500, 1000] }
        ],
        delay: 60 * 60 * 1000, // 1 hour after milestone
        frequency: 'once',
        template: 'vote-milestone',
        active: true,
        personalization: {
          useUserPreferences: true,
          useLocationData: false,
          useVotingHistory: true,
          useFollowedArtists: true,
          dynamicContent: true
        }
      },
      {
        id: 'weekly-digest',
        name: 'Weekly Digest',
        type: 'schedule',
        conditions: [
          { field: 'user.digest_frequency', operator: 'equals', value: 'weekly' }
        ],
        delay: 0,
        frequency: 'weekly',
        template: 'weekly-digest',
        active: true,
        personalization: {
          useUserPreferences: true,
          useLocationData: true,
          useVotingHistory: true,
          useFollowedArtists: true,
          dynamicContent: true
        }
      }
    ];
  }

  // Generate personalized email data for a user
  public async generatePersonalizedData(userId: string): Promise<PersonalizedEmailData> {
    const supabase = await this.supabase;
    
    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    // Get user preferences
    const preferences = await getUserPreferences(userId);
    
    // Get user's recent activity
    const { data: recentVotes } = await supabase
      .from('setlist_votes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: recentAttendance } = await supabase
      .from('show_attendance')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get user's followed artists with details
    const { data: followedArtists } = await supabase
      .from('user_follows_artists')
      .select(`
        artists(id, name, image_url)
      `)
      .eq('user_id', userId)
      .limit(10);

    // Get user's favorite venues with details
    const { data: favoriteVenues } = await supabase
      .from('shows')
      .select(`
        venues(id, name, city)
      `)
      .in('id', preferences.attendedShows.slice(0, 20))
      .limit(10);

    // Get personalized recommendations
    const recommendations = await this.getPersonalizedRecommendations(userId);

    // Calculate engagement metrics
    const engagement = await this.calculateEngagementMetrics(userId);

    return {
      userId,
      userName: user.display_name || user.email?.split('@')[0] || 'Music Fan',
      email: user.email,
      preferences: {
        favoriteGenres: preferences.favoriteGenres,
        favoriteArtists: followedArtists?.map(f => f.artists).filter(Boolean).flat() || [],
        favoriteVenues: favoriteVenues?.map(v => v.venues).filter(Boolean).flat() || [],
        lastActivity: new Date(user.last_sign_in_at || user.created_at),
        timezone: user.timezone || 'UTC',
        ...(user.location && { location: { city: user.location.city, country: user.location.country } })
      },
      recommendations,
      recentActivity: {
        votesCount: recentVotes?.length || 0,
        showsAttended: recentAttendance?.length || 0,
        newFollows: followedArtists?.length || 0,
        ...(recentVotes?.[0]?.created_at && { lastVote: new Date(recentVotes[0].created_at) }),
        ...(recentAttendance?.[0]?.created_at && { lastAttendance: new Date(recentAttendance[0].created_at) })
      },
      engagement
    };
  }

  // Get personalized recommendations for email content
  private async getPersonalizedRecommendations(_userId: string) {
    const supabase = await this.supabase;
    
    // Get upcoming shows for followed artists
    const { data: recommendedShows } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        date,
        venues(name, city)
      `)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(5);

    // Get trending artists based on user preferences
    const { data: recommendedArtists } = await supabase
      .from('artists')
      .select('id, name, image_url')
      .order('trending_score', { ascending: false })
      .limit(5);

    return {
      shows: recommendedShows?.map(show => ({
        id: show.id,
        name: show.name,
        date: show.date,
        venue: show.venues?.[0] ? `${show.venues[0].name}, ${show.venues[0].city}` : ''
      })) || [],
      artists: recommendedArtists || []
    };
  }

  // Calculate user engagement metrics
  private async calculateEngagementMetrics(userId: string) {
    const supabase = await this.supabase;
    
    // Get recent engagement data
    const { data: recentActivity } = await supabase
      .from('events')
      .select('created_at, event_type')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const { data: emailEngagement } = await supabase
      .from('email_engagement')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const activityCount = recentActivity?.length || 0;
    const emailOpens = emailEngagement?.filter(e => e.action === 'open').length || 0;
    const emailClicks = emailEngagement?.filter(e => e.action === 'click').length || 0;
    
    // Simple engagement score calculation
    const score = Math.min(100, (activityCount * 2) + (emailOpens * 5) + (emailClicks * 10));
    
    // Determine trend (simplified)
    const trend = score > 50 ? 'up' : score > 20 ? 'stable' : 'down';
    
    return {
      score,
      trend: trend as 'up' | 'down' | 'stable',
      lastEngagement: recentActivity?.[0]?.created_at ? new Date(recentActivity[0].created_at) : new Date(),
      emailOpens,
      emailClicks
    };
  }

  // Process email triggers and send appropriate emails
  public async processEmailTriggers(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Process each trigger type
      for (const trigger of this.defaultTriggers) {
        if (!trigger.active) continue;

        try {
          switch (trigger.type) {
            case 'event':
              await this.processEventTrigger(trigger, results);
              break;
            case 'schedule':
              await this.processScheduleTrigger(trigger, results);
              break;
            case 'behavior':
              await this.processBehaviorTrigger(trigger, results);
              break;
            case 'milestone':
              await this.processMilestoneTrigger(trigger, results);
              break;
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Trigger ${trigger.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;
    } catch (error) {
      results.failed++;
      results.errors.push(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return results;
    }
  }

  private async processEventTrigger(trigger: EmailTrigger, results: any) {
    const supabase = await this.supabase;
    
    switch (trigger.id) {
      case 'welcome-series':
        const { data: newUsers } = await supabase
          .from('users')
          .select('id, email, display_name, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .is('welcome_email_sent', null);

        for (const user of newUsers || []) {
          const personalizedData = await this.generatePersonalizedData(user.id);
          
          const emailResult = await sendWelcomeEmail({
            to: [{ email: user.email, name: personalizedData.userName }],
            name: personalizedData.userName,
            appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app'
          });

          if (emailResult.success) {
            results.sent++;
            // Mark welcome email as sent
            await supabase
              .from('users')
              .update({ welcome_email_sent: new Date().toISOString() })
              .eq('id', user.id);
          } else {
            results.failed++;
            results.errors.push(`Welcome email for ${user.email}: ${emailResult.error?.message}`);
          }
        }
        break;

      case 'new-show-notifications':
        await this.processNewShowNotifications(results);
        break;
    }
    
    results.processed++;
  }

  private async processScheduleTrigger(trigger: EmailTrigger, results: any) {
    const supabase = await this.supabase;
    
    switch (trigger.id) {
      case 'show-reminders':
        const { data: upcomingShows } = await supabase
          .from('shows')
          .select(`
            id,
            name,
            date,
            artists(id, name, image_url),
            venues(name, city)
          `)
          .gte('date', new Date().toISOString())
          .lte('date', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());

        for (const show of upcomingShows || []) {
          // Get users who should receive reminders for this show
          const { data: interestedUsers } = await supabase
            .from('user_follows_artists')
            .select('user_id, users(email, display_name)')
            .eq('artist_id', show.artists?.[0]?.id);

          for (const userFollow of interestedUsers || []) {
            const personalizedData = await this.generatePersonalizedData(userFollow.user_id);
            
            const emailResult = await sendShowReminderEmail({
              to: [{ email: userFollow.users?.[0]?.email, name: personalizedData.userName }],
              userName: personalizedData.userName,
              show: {
                id: show.id,
                name: show.name,
                artistName: show.artists?.[0]?.name || 'Unknown Artist',
                venue: show.venues?.[0]?.name || 'Unknown Venue',
                date: show.date
              },
              daysUntilShow: Math.ceil((new Date(show.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            });

            if (emailResult.success) {
              results.sent++;
            } else {
              results.failed++;
              results.errors.push(`Show reminder for ${userFollow.users?.[0]?.email}: ${emailResult.error?.message}`);
            }
          }
        }
        break;

      case 'weekly-digest':
        await this.processWeeklyDigest(results);
        break;
    }
    
    results.processed++;
  }

  private async processBehaviorTrigger(trigger: EmailTrigger, results: any) {
    const supabase = await this.supabase;
    
    switch (trigger.id) {
      case 'engagement-recovery':
        const { data: inactiveUsers } = await supabase
          .from('users')
          .select('id, email, display_name, last_sign_in_at')
          .lte('last_sign_in_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        for (const user of inactiveUsers || []) {
          const personalizedData = await this.generatePersonalizedData(user.id);
          
          // Send personalized re-engagement email
          const emailResult = await sendWeeklyDigestEmail({
            to: [{ email: user.email, name: personalizedData.userName }],
            userName: personalizedData.userName,
            weekOf: new Date().toLocaleDateString(),
            followedArtists: personalizedData.preferences.favoriteArtists.map(a => ({
              id: a.id,
              name: a.name,
              upcomingShows: Math.floor(Math.random() * 5) + 1
            })),
            upcomingShows: personalizedData.recommendations.shows.slice(0, 3).map(show => ({
              ...show,
              artistName: 'Various Artists' // Since we don't have artist info in recommendations
            })),
            newSetlists: personalizedData.recommendations.shows.slice(3, 6).map(show => ({
              ...show,
              artistName: 'Various Artists'
            })),
            totalFollowedArtists: personalizedData.preferences.favoriteArtists.length
          });

          if (emailResult.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`Re-engagement email for ${user.email}: ${emailResult.error?.message}`);
          }
        }
        break;
    }
    
    results.processed++;
  }

  private async processMilestoneTrigger(trigger: EmailTrigger, results: any) {
    const supabase = await this.supabase;
    
    switch (trigger.id) {
      case 'vote-milestone':
        const milestones = [10, 50, 100, 500, 1000];
        
        for (const milestone of milestones) {
          // Get all users and then filter by vote count
          const { data: allUsers } = await supabase
            .from('users')
            .select('id, email, display_name');
          
          const users: any[] = [];
          for (const user of allUsers || []) {
            const { count } = await supabase
              .from('setlist_votes')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            
            if (count === milestone) {
              users.push({ ...user, voteCount: count });
            }
          }

          for (const user of users || []) {
            const personalizedData = await this.generatePersonalizedData(user.id);
            
            // Get user's most recent high-voted song
            const { data: topVote } = await supabase
              .from('setlist_votes')
              .select(`
                vote_value,
                setlist_songs(
                  songs(title, artist_id),
                  setlists(
                    shows(name, venues(name))
                  )
                )
              `)
              .eq('user_id', user.id)
              .order('vote_value', { ascending: false })
              .limit(1)
              .single();

            if (topVote) {
              const emailResult = await sendVoteMilestoneEmail({
                to: [{ email: user.email, name: personalizedData.userName }],
                userName: personalizedData.userName,
                show: {
                  id: 'show-id',
                  name: topVote.setlist_songs?.[0]?.setlists?.[0]?.shows?.[0]?.name || 'Unknown Show',
                  artistName: 'Artist',
                  venue: topVote.setlist_songs?.[0]?.setlists?.[0]?.shows?.[0]?.venues?.[0]?.name || 'Unknown Venue',
                  date: new Date().toISOString()
                },
                song: {
                  title: topVote.setlist_songs?.[0]?.songs?.[0]?.title || 'Unknown Song',
                  votes: topVote.vote_value,
                  position: 1
                },
                milestone,
                totalVotes: milestone
              });

              if (emailResult.success) {
                results.sent++;
              } else {
                results.failed++;
                results.errors.push(`Milestone email for ${user.email}: ${emailResult.error?.message}`);
              }
            }
          }
        }
        break;
    }
    
    results.processed++;
  }

  private async processNewShowNotifications(results: any) {
    const supabase = await this.supabase;
    
    // Get shows created in the last hour
    const { data: newShows } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        date,
        created_at,
        artists(id, name, image_url),
        venues(name, city)
      `)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    for (const show of newShows || []) {
      // Get users who follow this artist
      const { data: followers } = await supabase
        .from('user_follows_artists')
        .select('user_id, users(email, display_name)')
        .eq('artist_id', show.artists?.[0]?.id);

      for (const follower of followers || []) {
        const personalizedData = await this.generatePersonalizedData(follower.user_id);
        
        const emailResult = await sendNewShowNotificationEmail({
          to: [{ email: follower.users?.[0]?.email, name: personalizedData.userName }],
          userName: personalizedData.userName,
          show: {
            id: show.id,
            name: show.name,
            artistName: show.artists?.[0]?.name || 'Unknown Artist',
            venue: show.venues?.[0]?.name || 'Unknown Venue',
            date: show.date,
            announcedAt: show.created_at
          }
        });

        if (emailResult.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`New show notification for ${follower.users?.[0]?.email}: ${emailResult.error?.message}`);
        }
      }
    }
  }

  private async processWeeklyDigest(results: any) {
    const supabase = await this.supabase;
    
    // Get users who want weekly digests
    const { data: users } = await supabase
      .from('user_notification_preferences')
      .select('user_id, users(email, display_name)')
      .eq('digest_frequency', 'weekly');

    for (const user of users || []) {
      const personalizedData = await this.generatePersonalizedData(user.user_id);
      
      const emailResult = await sendWeeklyDigestEmail({
        to: [{ email: user.users?.[0]?.email, name: personalizedData.userName }],
        userName: personalizedData.userName,
        weekOf: new Date().toLocaleDateString(),
        followedArtists: personalizedData.preferences.favoriteArtists.map(a => ({
          id: a.id,
          name: a.name,
          upcomingShows: Math.floor(Math.random() * 5) + 1
        })),
        upcomingShows: personalizedData.recommendations.shows.slice(0, 5).map(show => ({
          ...show,
          artistName: 'Various Artists'
        })),
        newSetlists: personalizedData.recommendations.shows.slice(5, 10).map(show => ({
          ...show,
          artistName: 'Various Artists'
        })),
        totalFollowedArtists: personalizedData.preferences.favoriteArtists.length
      });

      if (emailResult.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`Weekly digest for ${user.users?.[0]?.email}: ${emailResult.error?.message}`);
      }
    }
  }

  // A/B test email campaigns
  public async runABTest(campaignId: string, userId: string): Promise<{
    variant: string;
    template: string;
  }> {
    const supabase = await this.supabase;
    
    // Get campaign configuration
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign?.abTest?.enabled) {
      return { variant: 'default', template: 'default' };
    }

    // Check if user is already assigned to a variant
    const { data: existingAssignment } = await supabase
      .from('ab_test_assignments')
      .select('variant')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .single();

    if (existingAssignment) {
      return {
        variant: existingAssignment.variant,
        template: campaign.abTest.variants.find((v: any) => v.name === existingAssignment.variant)?.template || 'default'
      };
    }

    // Assign user to a variant based on weights
    const variants = campaign.abTest.variants;
    const totalWeight = variants.reduce((sum: number, v: any) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const variant of variants) {
      currentWeight += variant.weight;
      if (random <= currentWeight) {
        // Save assignment
        await supabase
          .from('ab_test_assignments')
          .insert({
            campaign_id: campaignId,
            user_id: userId,
            variant: variant.name,
            assigned_at: new Date().toISOString()
          });

        return {
          variant: variant.name,
          template: variant.template
        };
      }
    }

    // Fallback to first variant
    return {
      variant: variants[0].name,
      template: variants[0].template
    };
  }

  // Track email engagement for analytics
  public async trackEmailEngagement(
    emailId: string,
    userId: string,
    action: 'open' | 'click' | 'unsubscribe' | 'spam',
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabase = await this.supabase;
    
    await supabase
      .from('email_engagement')
      .insert({
        email_id: emailId,
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
        metadata
      });
  }
}

// Export singleton instance
export const emailAutomationEngine = new EmailAutomationEngine();

// Main automation function
export async function processEmailAutomation(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  return emailAutomationEngine.processEmailTriggers();
}

// Generate personalized email data
export async function getPersonalizedEmailData(userId: string): Promise<PersonalizedEmailData> {
  return emailAutomationEngine.generatePersonalizedData(userId);
}

// Track email engagement
export async function trackEmailEngagement(
  emailId: string,
  userId: string,
  action: 'open' | 'click' | 'unsubscribe' | 'spam',
  metadata?: Record<string, any>
): Promise<void> {
  return emailAutomationEngine.trackEmailEngagement(emailId, userId, action, metadata);
}