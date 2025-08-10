# MySetlist Scripts

This directory contains all the automation scripts for the MySetlist application.

## 🚀 Main Deployment Command

### `pnpm deploy`

**The all-in-one deployment command that handles everything:**

```bash
pnpm deploy
```

This command will:
1. ✅ Verify environment and dependencies
2. ✅ Install/update packages
3. ✅ Run database migrations
4. ✅ Generate TypeScript types
5. ✅ Run type checking
6. ✅ Build the application
7. ✅ Deploy Supabase Edge Functions
8. ✅ Setup/update cron jobs
9. ✅ Commit all changes to Git
10. ✅ Push to remote repository
11. ✅ Deploy to Vercel production

## 📋 Other Available Commands

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server

### Code Quality
- `pnpm lint` - Check code style
- `pnpm lint:fix` - Fix code style issues
- `pnpm typecheck` - Check TypeScript types
- `pnpm test` - Run tests

### Database
- `pnpm db:push` - Push schema to database
- `pnpm db:generate` - Generate migrations
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open database GUI
- `pnpm db:seed` - Seed database with sample data

### Data Sync
- `pnpm sync:artists` - Sync trending artists
- `pnpm sync:popular` - Sync popular artists
- `pnpm sync:trending` - Initialize trending data

### Deployment Options
- `pnpm deploy` - **Complete deployment (recommended)**
- `pnpm deploy:preview` - Deploy preview to Vercel
- `pnpm deploy:prod` - Deploy only to Vercel production (no other steps)

### Utilities
- `pnpm clean` - Clean all build artifacts
- `pnpm check:env` - Verify environment variables
- `pnpm analyze` - Analyze bundle size

## 🔧 Script Files

### Core Deployment
- `deploy-all.ts` - Main deployment orchestrator
- `quick-deploy.sh` - Simple wrapper for quick deploys

### Data Management
- `seed-comprehensive-data.ts` - Database seeding
- `sync-trending-artists.ts` - Artist sync from APIs
- `sync-popular-artists.ts` - Popular artist import
- `initialize-trending-data.ts` - Trending system setup

### Utilities
- `check-env.ts` - Environment validation
- `check-env-apis.ts` - API key validation
- `check-db-sync.ts` - Database sync status
- `check-sync-status.ts` - Sync job monitoring

## 🚨 Troubleshooting

### Deployment Failed?

1. **Environment Issues**
   ```bash
   pnpm check:env
   ```

2. **Database Issues**
   ```bash
   pnpm db:studio  # Check schema
   pnpm db:push    # Update schema
   ```

3. **Build Issues**
   ```bash
   pnpm clean      # Clean artifacts
   pnpm build      # Try building again
   ```

4. **Vercel Issues**
   ```bash
   vercel login    # Re-authenticate
   vercel          # Re-link project
   ```

### Manual Deployment Steps

If the automated deployment fails, you can run steps manually:

```bash
# 1. Database
pnpm db:generate && pnpm db:push

# 2. Build
pnpm build

# 3. Git
git add -A && git commit -m "chore: deployment" && git push

# 4. Deploy
vercel --prod
```

## 📝 Notes

- The main `pnpm deploy` command is idempotent - safe to run multiple times
- All deployment steps include error handling and recovery
- Check `.env.local` for required environment variables
- Supabase project ID is hardcoded in scripts for this project
- Vercel must be configured before first deployment (`vercel` command)