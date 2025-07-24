# MySetlist Documentation Index

## Primary Documentation

### Deployment & Setup
- **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - Main deployment guide (consolidated)
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)** - Detailed production configurations
- **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** - Environment variables configuration

### Project Documentation
- **[README.md](./README.md)** - Project overview and getting started
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code project instructions
- **[CRITICAL_FIXES_SUMMARY.md](./CRITICAL_FIXES_SUMMARY.md)** - Current issues and fixes needed

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
  - `SYNC_SYSTEM.md` - Data synchronization system
  - `TRENDING_SYSTEM.md` - Trending algorithm documentation

### Testing & QA
- **[apps/web/FINAL_QA_SUMMARY.md](./apps/web/FINAL_QA_SUMMARY.md)** - Final QA report
- **[apps/web/QA_TESTING_PERFORMANCE_REPORT.md](./apps/web/QA_TESTING_PERFORMANCE_REPORT.md)** - Testing infrastructure
- **[apps/web/docs/QA_STRATEGY.md](./apps/web/docs/QA_STRATEGY.md)** - QA strategy guide

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
Old reports and redundant guides have been moved to `docs-archive/` for reference.