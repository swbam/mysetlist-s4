# Email Notifications Setup for TheSet

This guide covers the setup and configuration of the comprehensive email notification system for TheSet.

## Overview

The email notification system provides:
- Welcome emails for new users
- Show reminders for upcoming concerts
- New show announcements when artists announce tours
- Setlist update notifications
- Weekly digest emails with personalized content
- Password reset and email verification
- Granular user preferences with frequency controls
- Unsubscribe functionality
- Automated cron jobs for email processing

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Resend Configuration
RESEND_TOKEN=re_your_resend_api_key_here
RESEND_FROM=noreply@yourdomain.com

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cron Job Security
CRON_SECRET=your_secure_random_string_here
```

## Resend Setup

1. Sign up for a Resend account at https://resend.com
2. Verify your domain or use their test domain
3. Create an API key in the Resend dashboard
4. Add the API key to `RESEND_TOKEN`
5. Set `RESEND_FROM` to your verified sending address

## Database Migration

Run the email notifications migration:

```sql
-- Run this migration to create the email notification tables
-- File: packages/database/migrations/0005_email_notifications.sql
```

This creates:
- `email_preferences` - User email preferences and frequency settings
- `email_unsubscribes` - Unsubscribe tokens and preferences
- `email_queue` - Scheduled email queue with retry logic
- `email_logs` - Email delivery tracking and analytics

## Cron Jobs

The system includes three automated cron jobs:

### 1. Email Processing (Every 5 minutes)
- **Path**: `/api/cron/email-processing`
- **Schedule**: `*/5 * * * *`
- **Function**: Processes queued emails and handles retries

### 2. Daily Show Reminders (9 AM daily)
- **Path**: `/api/cron/daily-reminders`
- **Schedule**: `0 9 * * *`
- **Function**: Sends show reminders for tomorrow's concerts

### 3. Weekly Digest (8 AM Mondays)
- **Path**: `/api/cron/weekly-digest`
- **Schedule**: `0 8 * * 1`
- **Function**: Sends weekly summary emails

## Email Templates

The system includes 7 email templates:

1. **Welcome Email** - Sent to new users upon registration
2. **Show Reminder** - Reminds users about upcoming shows
3. **New Show Notification** - Announces new shows from followed artists
4. **Setlist Update** - Notifies about new or updated setlists
5. **Weekly Digest** - Weekly summary of followed artists' activity
6. **Password Reset** - Secure password reset emails
7. **Email Verification** - Account verification emails

## User Preferences

Users can control their email preferences through the settings page:

- **Master toggle** for all email notifications
- **Show reminders** with frequency options (immediately, daily, weekly, never)
- **New show notifications** with frequency options
- **Setlist updates** with frequency options
- **Weekly digest** toggle
- **Marketing emails** toggle
- **Security emails** (cannot be disabled)

## Frequency Options

- **Immediately**: Emails sent as events occur
- **Daily**: Batched into daily digest at 9 AM
- **Weekly**: Included in Monday weekly digest
- **Never**: No emails for this type

## Triggering Email Notifications

Use the provided trigger functions in your application:

```typescript
import {
  triggerWelcomeEmail,
  triggerNewShowNotifications,
  triggerSetlistUpdateNotifications,
  triggerEmailVerification,
  triggerPasswordReset
} from '@/lib/email-triggers';

// Welcome new user
await triggerWelcomeEmail(userId);

// New show announced
await triggerNewShowNotifications(showId);

// Setlist updated
await triggerSetlistUpdateNotifications(
  showId, 
  newSongs, 
  'updated'
);

// Email verification
await triggerEmailVerification(userId, verificationToken);

// Password reset
await triggerPasswordReset(userId, resetToken);
```

## Unsubscribe System

The system includes a complete unsubscribe flow:

1. **Unsubscribe links** in all emails with unique tokens
2. **Unsubscribe page** (`/unsubscribe`) for processing requests
3. **Success page** (`/unsubscribe/success`) confirming unsubscription
4. **Error page** (`/unsubscribe/error`) for invalid tokens
5. **Token validation** with expiration (30 days)

## Email Queue System

Features:
- **Scheduled delivery** for frequency-based notifications
- **Retry logic** with exponential backoff
- **Error tracking** and logging
- **Batch processing** to avoid rate limits
- **Queue cleanup** for old processed emails

## Monitoring and Analytics

The system logs:
- **Delivery status** (sent, delivered, bounced, failed)
- **User engagement** (opens, clicks)
- **Queue performance** (processing times, retry counts)
- **Error tracking** for debugging

## Security Features

- **CRON_SECRET** protects cron endpoints from unauthorized access
- **Unsubscribe tokens** are signed and time-limited
- **Email validation** prevents spam and abuse
- **Rate limiting** built into the queue system

## Development Testing

For development, you can manually trigger emails:

```bash
# Process email queue
curl -X POST http://localhost:3001/api/cron/email-processing \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_queue"}'

# Send daily reminders
curl -X POST http://localhost:3001/api/cron/email-processing \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json" \
  -d '{"action": "daily_reminders"}'

# Send weekly digest
curl -X POST http://localhost:3001/api/cron/email-processing \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json" \
  -d '{"action": "weekly_digest"}'

# Cleanup old data
curl -X POST http://localhost:3001/api/cron/email-processing \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup"}'
```

## Production Deployment

1. **Set environment variables** in your deployment platform
2. **Configure domain** in Resend dashboard
3. **Set up webhooks** (optional) for delivery tracking
4. **Monitor cron jobs** for proper execution
5. **Set up alerts** for email delivery failures

## Email Template Customization

Templates are built with React Email and can be customized:

1. Edit templates in `packages/email/templates/`
2. Preview templates using React Email dev tools
3. Test with preview props included in each template
4. Templates automatically use Tailwind CSS for styling

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check RESEND_TOKEN is valid
   - Verify RESEND_FROM domain is verified
   - Check cron job execution logs

2. **Cron jobs not running**
   - Verify CRON_SECRET is set correctly
   - Check Vercel cron job configuration
   - Monitor cron job logs in deployment platform

3. **Users not receiving emails**
   - Check user email preferences
   - Verify user hasn't unsubscribed
   - Check email delivery logs

4. **Template rendering issues**
   - Verify all template props are provided
   - Check for missing data in emailData JSON
   - Test templates with preview props

### Debug Commands

```typescript
// Check user preferences
const prefs = await getUserEmailPreferences();
console.log(prefs);

// Check email queue
const queue = await database.select().from(emailQueue).where(eq(emailQueue.userId, userId));
console.log(queue);

// Check email logs
const logs = await database.select().from(emailLogs).where(eq(emailLogs.userId, userId));
console.log(logs);
```

## Support

For issues with the email system:
1. Check the email logs in the database
2. Review cron job execution logs
3. Verify environment variables are set correctly
4. Test with development endpoints
5. Contact support with specific error messages and user IDs