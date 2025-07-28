# MySetlist - Concert Setlist Voting Platform

MySetlist is a modern web application that allows music fans to discover artists, explore upcoming shows, and vote on predicted setlists. Built with Next.js 14, TypeScript, and Supabase, it provides a seamless experience for concert-goers to engage with their favorite artists' performances.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## 📋 Deployment Guide

### Pre-Deployment Checklist

Before deploying to production, ensure all requirements are met:

```bash
# Run comprehensive pre-deployment checks
pnpm tsx scripts/pre-deployment-checklist.ts
```

This script verifies:

- ✅ All required environment variables are set
- ✅ Database connection is established
- ✅ Build completes without errors
- ✅ TypeScript compilation passes
- ✅ API endpoints are properly configured
- ✅ Critical files exist

### Deployment Process

#### Option 1: Automated Deployment (Recommended)

Use the interactive deployment guide for a step-by-step process:

```bash
# Run the deployment guide
pnpm tsx scripts/deployment-guide.ts
```

This will:

1. Run pre-deployment checks
2. Verify git status
3. Install dependencies
4. Run database migrations
5. Build the application
6. Deploy to Vercel
7. Optionally run post-deployment tests

#### Option 2: Manual Deployment

```bash
# 1. Ensure environment is ready
pnpm check:env

# 2. Build the application
pnpm build

# 3. Run tests
pnpm test

# 4. Deploy to Vercel
pnpm vercel:prod

# 5. Run post-deployment verification
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app pnpm tsx scripts/post-deployment-test.ts
```

#### Option 3: Quick Deployment (Use with caution)

```bash
# For emergency deployments only
pnpm final:emergency
```

### Post-Deployment Verification

After deployment, verify everything is working correctly:

```bash
# Run comprehensive post-deployment tests
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app pnpm tsx scripts/post-deployment-test.ts
```

This tests:

- 🧪 All pages load without 500 errors
- 🧪 Search functionality works
- 🧪 API endpoints respond correctly
- 🧪 Database queries execute properly
- 🧪 Critical user journeys complete successfully

### Environment Variables

Required environment variables for production:

```env
# Core Configuration
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...

# External APIs
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
TICKETMASTER_API_KEY=your-ticketmaster-key
SETLIST_FM_API_KEY=your-setlist-fm-key
```

### Deployment Scripts

| Script                                         | Description                               | When to Use             |
| ---------------------------------------------- | ----------------------------------------- | ----------------------- |
| `pnpm tsx scripts/pre-deployment-checklist.ts` | Comprehensive pre-deployment verification | Before every deployment |
| `pnpm tsx scripts/deployment-guide.ts`         | Interactive deployment process            | For guided deployments  |
| `pnpm tsx scripts/post-deployment-test.ts`     | Post-deployment verification              | After deployment        |
| `pnpm final`                                   | Simple deployment script                  | Quick deployments       |
| `pnpm final:validate`                          | Validation without deployment             | Testing readiness       |
| `pnpm final:staging`                           | Deploy to staging                         | Testing changes         |
| `pnpm final:emergency`                         | Emergency deployment                      | Critical fixes only     |

### Rollback Procedures

If issues are detected after deployment:

```bash
# Option 1: Using Vercel CLI
vercel rollback

# Option 2: Using deployment guide
pnpm tsx scripts/deployment-guide.ts
# Select rollback option when prompted

# Option 3: Manual rollback
vercel ls --limit 5  # List recent deployments
vercel alias set <deployment-url> <your-domain>
```

### Monitoring & Maintenance

After deployment:

1. **Monitor Logs**: Check Vercel logs for errors

   ```bash
   vercel logs --follow
   ```

2. **Check Performance**: Monitor Core Web Vitals

   ```bash
   pnpm perf:lighthouse
   ```

3. **Database Health**: Verify database connectivity

   ```bash
   curl https://your-app.vercel.app/api/health/db
   ```

4. **Error Tracking**: Monitor Sentry for any errors

### Troubleshooting

Common deployment issues and solutions:

#### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next
pnpm build
```

#### Environment Variable Issues

```bash
# Verify all variables are set
pnpm check:env

# Pull from Vercel
vercel env pull .env.production
```

#### Database Connection Issues

```bash
# Test database connection
pnpm tsx scripts/check-database.ts
```

#### TypeScript Errors

```bash
# Check for type errors
pnpm typecheck
```

## 🏗️ Architecture

- **Frontend**: Next.js 14 with App Router
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Package Manager**: pnpm with Turborepo

## 📱 Features

- 🔍 Artist and venue search
- 🎤 Show discovery and exploration
- 🗳️ Setlist voting and predictions
- 📊 Trending artists and shows
- 🎵 Spotify integration
- 🎫 Ticketmaster integration
- 📱 Mobile-responsive design
- 🔄 Real-time voting updates

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Run with coverage
pnpm test:coverage
```

## 🔧 Development

```bash
# Start development server
pnpm dev

# Run database studio
pnpm db:studio

# Sync trending artists
pnpm sync:artists

# Seed database with test data
pnpm seed:all
```

## 📊 Performance

Target metrics:

- Lighthouse Score: ≥90
- First Contentful Paint: <1.8s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3.8s
- Cumulative Layout Shift: <0.1

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next-Forge](https://github.com/haydenbleasel/next-forge)
- Powered by [Supabase](https://supabase.com)
- Deployed on [Vercel](https://vercel.com)
