# GitHub Actions Workflows

This directory contains the CI/CD workflows for the MySetlist project.

## Main Workflows

### `ci-simple.yml`

- **Purpose**: Basic CI checks (type checking, linting)
- **Triggers**: Push to main/develop, Pull requests
- **Status**: Continues on error to show all issues

### `vercel-deploy.yml`

- **Purpose**: Production deployment to Vercel
- **Triggers**: Push to main branch
- **Requirements**:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

### `production-deployment.yml`

- **Purpose**: Full production deployment pipeline with tests
- **Triggers**: Push to main, Pull requests to main
- **Requirements**: All environment variables listed below

## Required Environment Variables

### Vercel Deployment

- `VERCEL_TOKEN`: Your Vercel authentication token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

### Application Secrets

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `DATABASE_URL`: PostgreSQL connection string

### External APIs

- `SPOTIFY_CLIENT_ID`: Spotify app client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify app client secret
- `TICKETMASTER_API_KEY`: Ticketmaster API key
- `SETLISTFM_API_KEY`: Setlist.fm API key

### Optional

- `SENTRY_AUTH_TOKEN`: For error tracking
- `SLACK_WEBHOOK_URL`: For deployment notifications
- `CRON_SECRET`: For scheduled jobs authentication

## Setting up Secrets

1. Go to your GitHub repository settings
2. Navigate to Secrets and variables > Actions
3. Add each required secret with the appropriate value

For Vercel secrets:

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Get your org and project IDs from `.vercel/project.json`
