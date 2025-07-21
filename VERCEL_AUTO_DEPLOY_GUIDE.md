# Vercel Automatic Deployment Configuration

## Current Setup

Your Vercel project is configured to automatically deploy when changes are pushed to:
- `main` branch (production)
- `mysetlist-completion-fix` branch (preview)

## Vercel Dashboard Settings

To ensure automatic deployments are working correctly, verify these settings in your Vercel dashboard:

### 1. Go to Project Settings
1. Visit https://vercel.com/dashboard
2. Select your "windhoek" project
3. Click on "Settings" tab

### 2. Git Configuration
Navigate to **Settings → Git** and ensure:
- ✅ **Connected to GitHub**: Should show "swbam/mysetlist-s4"
- ✅ **Production Branch**: Set to "main"
- ✅ **Automatic Deployments**: Enabled for all branches

### 3. Environment Variables
Navigate to **Settings → Environment Variables** and ensure these are set:
- `NEXT_PUBLIC_URL`: 
  - Production: `https://theset.live`
  - Preview: `https://windhoek.vercel.app`
- All Supabase keys (NEXT_PUBLIC_SUPABASE_URL, etc.)
- All API keys (Spotify, Ticketmaster, SetlistFM)

### 4. Deployment Settings
Navigate to **Settings → General**:
- **Framework Preset**: Next.js
- **Build Command**: `cd apps/web && pnpm build`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Node.js Version**: 20.x (or latest LTS)

## How Automatic Deployments Work

1. **Push to GitHub** → Vercel receives webhook
2. **Vercel runs build** → Uses settings from vercel.json
3. **Preview URL generated** → For non-main branches
4. **Production deployed** → Only for main branch

## Deployment URLs

| Branch | URL | Type |
|--------|-----|------|
| main | https://theset.live | Production |
| mysetlist-completion-fix | https://windhoek-[hash].vercel.app | Preview |
| Any other branch | https://windhoek-[hash].vercel.app | Preview |

## Troubleshooting

### If deployments aren't triggering:
1. Check **Deployments** tab in Vercel dashboard
2. Verify GitHub integration under **Settings → Git**
3. Check for deployment errors in the build logs

### Common Issues:
- **Build failures**: Check package.json scripts and dependencies
- **Environment variables**: Ensure all required vars are set
- **Cron jobs**: Hobby accounts limited to 1 cron job per day

## Manual Deployment

If needed, you can manually trigger a deployment:
```bash
# Using Vercel CLI
vercel

# Force production deployment
vercel --prod
```

## Monitoring Deployments

1. **GitHub**: Check marks (✅) or crosses (❌) next to commits
2. **Vercel Dashboard**: Real-time build logs and deployment status
3. **Email Notifications**: Vercel sends emails for failed deployments

## Branch Protection (Recommended)

For production safety, consider adding these GitHub branch protection rules for `main`:
- Require pull request reviews
- Require status checks (Vercel deployment)
- Dismiss stale reviews
- Include administrators