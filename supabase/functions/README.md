# Supabase Edge Functions

## Important Notice

All sync and data processing functionality has been consolidated into the Next.js API routes located at `apps/web/app/api/`. This change was made to:

1. **Avoid redundancy** - Having the same functionality in both Edge Functions and API routes was confusing and harder to maintain
2. **Simplify deployment** - Everything deploys with the Next.js app on Vercel
3. **Better integration** - API routes have direct access to the app's configuration and utilities
4. **Consistent patterns** - Following next-forge patterns for API development

## Current API Routes

All functionality previously in Edge Functions is now available at:

- `/api/cron/calculate-trending` - Updates trending scores for artists, shows, and venues
- `/api/cron/master-sync` - Orchestrates all data synchronization
- `/api/sync/artists` - Syncs artist data from external APIs
- `/api/sync/shows` - Syncs show data from external APIs
- `/api/sync/setlists` - Syncs setlist data
- `/api/email/automation` - Processes email queue

## Cron Jobs

Supabase cron jobs (pg_cron) should be updated to call the API endpoints instead of Edge Functions:

```sql
-- Example: Update trending scores every 30 minutes
SELECT cron.schedule(
  'calculate-trending',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-domain.com/api/cron/calculate-trending',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')),
    body := jsonb_build_object('trigger', 'cron')
  ) as request_id;
  $$
);
```

## Future Edge Functions

Only create new Edge Functions for:
- Webhook handlers that need to be separate from the main app
- Database-intensive operations that benefit from being closer to the data
- Functions that need Deno-specific capabilities

For all other use cases, create API routes in the Next.js app.
