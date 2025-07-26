# MySetlist Documentation Index

## Primary Documentation

### Deployment & Setup
- **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - Main deployment guide (consolidated)
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)** - Detailed production configurations
- **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** - Environment variables configuration

### Project Documentation
- **[README.md](./README.md)** - Project overview and getting started
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code project instructions
- **[ENVIRONMENT_URLS.md](./ENVIRONMENT_URLS.md)** - Environment URL configurations

### Core Documentation
- **[mysetlist-docs/](./mysetlist-docs/)** - Comprehensive project documentation
  - `01-project-overview-and-architecture.md`
  - `02-database-schema-and-models.md`
  - `03-authentication-and-user-management.md`
  - `04-core-features-and-components.md`
  - `05-api-integrations-and-external-services.md`
  - `06-deployment-monitoring-and-production.md`

### Technical Documentation
- **[docs/](./docs/)** - Technical guides
  - `DATA_INITIALIZATION.md` - Data setup guide
  - `DEPLOYMENT_GUIDE.md` - Technical deployment information
  - `PRODUCTION_READINESS_CHECKLIST.md` - Production checklist
  - `SYNC_SYSTEM.md` - Data synchronization system
  - `TRENDING_SYSTEM.md` - Trending algorithm documentation

### Testing & QA
- **[apps/web/docs/](./apps/web/docs/)** - Application-specific documentation
  - `QA_STRATEGY.md` - QA strategy guide
  - `testing-guide.md` - Testing infrastructure
  - `UI-UX-PERFORMANCE-IMPROVEMENTS.md` - UI/UX improvements
  - `email-and-cron-setup.md` - Email and cron setup
  - `realtime-features.md` - Real-time features guide
  - `sentry-logging.md` - Error logging setup
  - `spotify-auth-setup.md` - Spotify authentication setup

### Package Documentation
- Individual README files in each package directory
- Migration guide in `packages/database/MIGRATIONS_README.md`

## Quick Commands

### Development
```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm test       # Run tests
```

### Deployment
```bash
pnpm check:env  # Validate environment
vercel          # Deploy preview
vercel --prod   # Deploy production
```

### Database
```bash
pnpm db:push    # Push schema changes
pnpm db:migrate # Run migrations
pnpm db:studio  # Open Prisma Studio
```

## Archived Documentation

Historical reports and analysis have been moved to `docs-archive/` for reference:
- `docs-archive/status-reports/` - Project status reports and completion summaries
- `docs-archive/analysis-reports/` - Performance and technical analysis reports
- `docs-archive/deployment-guides/` - Superseded deployment documentation
- `docs-archive/project-planning/` - Early project planning and requirements