# Email and Cron Job Setup Guide

## Email System Overview

MySetlist uses Resend for email delivery and React Email for templates. The system includes:

- **Email Queue**: Stores emails to be sent with retry logic
- **Email Templates**: React-based email templates for various notifications
- **Email Preferences**: User-configurable email settings
- **Batch Sending**: Efficient bulk email processing

## Configuration

### Required Environment Variables

Add these to your `.env.local` file:

```env
# Email Service (Resend)
RESEND_TOKEN=re_xxxxxxxxxxxxx  # Get from https://resend.com
RESEND_FROM=noreply@yourdomain.com
EMAIL_FROM=noreply@yourdomain.com

# Admin notifications
ADMIN_EMAIL=admin@yourdomain.com

# Cron Security
CRON_SECRET=your-random-secret-key
EMAIL_SYSTEM_TOKEN=your-email-system-token
```

## Email Templates

Located in `packages/email/templates/`:

1. **Welcome Email** - Sent to new users
2. **Show Reminder** - Daily reminders for upcoming shows
3. **Weekly Digest** - Weekly summary of followed artists
4. **New Show Notification** - When followed artists announce shows
5. **Setlist Update** - When setlists are updated
6. **Vote Milestone** - When songs reach vote milestones
7. **Password Reset** - Account recovery
8. **Email Verification** - Email address verification

## Cron Jobs

All cron jobs are protected by the `CRON_SECRET` environment variable.

### 1. Email Processing (Every 5 minutes)

- **Endpoint**: `/api/cron/email-processing`
- **Function**: Processes queued emails, sends reminders

### 2. Hourly Update

- **Endpoint**: `/api/cron/hourly-update`
- **Functions**:
  - Updates trending scores for artists and shows
  - Cleans up old data
  - Updates show statuses (upcoming → completed)

### 3. Daily Sync

- **Endpoint**: `/api/cron/daily-sync`
- **Functions**:
  - Syncs artist data that hasn't been updated in 24 hours
  - Updates show statuses
  - Triggers data cleanup

### 4. Weekly Digest (Mondays at 8 AM)

- **Endpoint**: `/api/cron/weekly-digest`
- **Function**: Sends weekly email digests to subscribed users

### 5. Health Check (Every 10 minutes)

- **Endpoint**: `/api/cron/health-check`
- **Functions**:
  - Checks database connectivity
  - Verifies API responsiveness
  - Sends alerts for critical issues

## Setting Up Cron Jobs

### Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/email-processing",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/hourly-update",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### Local Development

For local testing, manually trigger cron endpoints:

```bash
# Test email processing
curl -X GET http://localhost:3001/api/cron/email-processing \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test health check
curl -X GET http://localhost:3001/api/cron/health-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Testing Email System

### Test Endpoint

Use the test endpoint to verify email configuration:

```bash
# Check configuration
curl http://localhost:3001/api/test/email

# Send test email
curl -X POST http://localhost:3001/api/test/email \
  -H "Authorization: Bearer YOUR_EMAIL_SYSTEM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test-all",
    "data": {
      "email": "your-email@example.com"
    }
  }'
```

### Available Test Actions

- `test-welcome` - Send a welcome email
- `test-reminder` - Send a show reminder
- `test-notification` - Send a generic notification
- `test-queue` - Add email to queue
- `process-queue` - Process email queue
- `test-all` - Test all email types

## Email Queue Management

### Queue Structure

Emails are stored in the `email_queue` table with:

- Retry logic (max 3 attempts)
- Scheduled sending time
- Error tracking
- Processing status

### Manual Queue Management

```typescript
// Queue an email
await queueEmail({
  userId: "user-id",
  emailType: "welcome",
  emailData: {
    /* template data */
  },
  scheduledFor: new Date(),
});

// Process queue manually
await processQueuedEmails();
```

## Monitoring

### Email Logs

All sent emails are logged in the `email_logs` table with:

- Recipient information
- Send status
- Timestamps
- Resend ID for tracking

### Health Monitoring

The health check endpoint monitors:

- Database connectivity and response time
- API endpoint availability
- Overall system health

Critical alerts are sent to `ADMIN_EMAIL` when issues are detected.

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Resend API key is valid
   - Verify FROM email is verified in Resend
   - Check email queue for errors

2. **Cron jobs not running**
   - Verify CRON_SECRET matches
   - Check Vercel cron logs
   - Test endpoints manually

3. **Health check failures**
   - Check database connection
   - Verify API endpoints are accessible
   - Review error logs

### Debug Mode

Enable debug logging:

```typescript
// In email service
console.log("Email send attempt:", { to, subject, template });

// In cron jobs
console.log("Cron job started:", { job, timestamp });
```

## Best Practices

1. **Rate Limiting**: Batch emails to avoid rate limits
2. **Error Handling**: Always handle email failures gracefully
3. **User Preferences**: Respect unsubscribe requests
4. **Testing**: Test all email templates before production
5. **Monitoring**: Set up alerts for failed cron jobs

## Security Considerations

1. **Authentication**: All cron endpoints require Bearer token
2. **Input Validation**: Validate all email addresses and content
3. **Rate Limiting**: Implement rate limits on public endpoints
4. **Secrets**: Never commit API keys or secrets
5. **CORS**: Configure CORS appropriately for API endpoints
