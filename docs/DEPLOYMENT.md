# 🚀 Ultimate MySetlist Deployment Guide

## Overview

The MySetlist application features a comprehensive, production-ready deployment system with the `pnpm final` command. This system provides automated deployment with intelligent error handling, rollback capabilities, and parallel execution optimization.

## Quick Start

### Basic Deployment Commands

```bash
# Development deployment (default)
pnpm final

# Production deployment
pnpm final:prod

# Staging deployment
pnpm final:staging

# Validation only (no deployment)
pnpm final:validate

# Quick deployment (skip tests)
pnpm final:quick

# Force deployment (ignore errors)
pnpm final:force

# Rollback last deployment
pnpm final:rollback

# Verbose logging
pnpm final:verbose
```

### Advanced Usage

```bash
# Custom deployment with specific flags
pnpm final --prod --parallel --verbose --skip-tests

# Dry run (simulation only)
pnpm final --dry-run

# Skip specific phases
pnpm final --skip-db --skip-functions --skip-tests

# Maximum parallel execution
pnpm final --parallel --quick --yes
```

## Deployment Architecture

### 8-Phase Deployment Process

1. **🔍 Environment Validation**
   - Tool availability checks (Node.js, pnpm, Supabase CLI, Vercel CLI)
   - Environment variable validation
   - API connectivity testing

2. **📝 Code Quality Validation**
   - TypeScript type checking
   - ESLint code quality
   - Boundary checking
   - Parallel execution when `--parallel` flag is used

3. **🗄️ Database Operations**
   - Production backup creation
   - Database schema generation
   - Migration execution
   - Supabase integration

4. **🏗️ Application Build**
   - Dependency installation
   - Bundle generation
   - Build optimization
   - Bundle analysis for production

5. **⚡ Supabase Functions Deployment**
   - Edge function deployment
   - Secret management
   - Parallel function deployment
   - Cron job setup

6. **🚀 Vercel Deployment**
   - Application deployment
   - Environment-specific configuration
   - Auto-accept prompts for CI/CD

7. **🔍 Post-Deployment Validation**
   - Health check endpoint testing
   - Service availability verification
   - Performance validation

8. **⚡ Performance Monitoring**
   - Lighthouse audit execution
   - Score validation
   - Performance reporting

## Command Line Flags

### Environment Flags
- `--prod` / `--production` - Production environment
- `--staging` - Staging environment
- (default) - Development environment

### Execution Flags
- `--parallel` - Enable parallel execution where safe
- `--yes` / `-y` - Auto-accept all prompts
- `--force` - Ignore validation failures
- `--verbose` / `-v` - Detailed logging
- `--dry-run` - Simulation mode (no actual deployment)

### Skip Flags
- `--skip-tests` - Skip code quality validation
- `--skip-build` - Skip application build
- `--skip-db` - Skip database operations
- `--skip-functions` - Skip Supabase functions
- `--skip-vercel` - Skip Vercel deployment

### Utility Flags
- `--quick` - Fast deployment (skip non-essential steps)
- `--validate-only` - Run validation without deployment
- `--rollback` - Rollback last deployment

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# API Integrations
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your-spotify-client-id
TICKETMASTER_API_KEY=your-ticketmaster-api-key

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### Environment Validation

Use the built-in environment checker:

```bash
# Check all required variables
pnpm check:env

# Test API connectivity
pnpm check:env --test-apis

# Validate deployment environment
pnpm final:validate
```

## Deployment Workflows

### Development Workflow

```bash
# 1. Validate environment
pnpm final:validate

# 2. Quick deployment
pnpm final:quick

# 3. Full deployment with tests
pnpm final --verbose
```

### Production Workflow

```bash
# 1. Pre-deployment validation
pnpm final:validate

# 2. Production deployment
pnpm final:prod

# 3. Post-deployment verification
curl https://your-app.vercel.app/api/health
```

### CI/CD Integration

```bash
# Automated deployment (no prompts)
pnpm final:prod --yes --parallel

# With validation
pnpm final:validate && pnpm final:prod --yes

# Emergency rollback
pnpm final:rollback --yes
```

## Health Monitoring

### Health Check Endpoint

The deployment system includes a comprehensive health check endpoint:

```bash
# Basic health check
curl https://your-app.vercel.app/api/health

# Example response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": "150ms",
  "system": {
    "environment": "production",
    "version": "1.0.0",
    "deployment": {
      "vercel": {
        "url": "your-app.vercel.app",
        "region": "iad1",
        "branch": "main",
        "commit": "abc1234"
      }
    }
  },
  "services": {
    "database": {
      "healthy": true,
      "message": "Database connection successful",
      "responseTime": "45ms"
    },
    "auth": {
      "healthy": true,
      "message": "Auth service operational",
      "responseTime": "32ms"
    },
    "apis": {
      "healthy": true,
      "message": "All API integrations healthy",
      "details": {
        "spotify": { "healthy": true, "message": "Spotify API accessible" },
        "ticketmaster": { "healthy": true, "message": "Ticketmaster API accessible" }
      },
      "responseTime": "89ms"
    }
  },
  "uptime": 3600
}
```

## Error Handling & Rollback

### Automatic Error Handling

The deployment system includes comprehensive error handling:

- **Retry Logic**: Commands retry up to 3 times with progressive backoff
- **Graceful Degradation**: Non-essential failures don't stop deployment
- **Rollback on Failure**: Production deployments automatically rollback on critical failures
- **Backup & Restore**: Database backups created before production deployments

### Manual Rollback

```bash
# Rollback last deployment
pnpm final:rollback

# Force rollback (ignore errors)
pnpm final:rollback --force

# Check rollback status
curl https://your-app.vercel.app/api/health
```

## Performance Optimization

### Parallel Execution

Enable parallel execution for faster deployments:

```bash
# Enable parallel processing
pnpm final --parallel

# Maximum parallel with quick mode
pnpm final --parallel --quick --yes
```

### Bundle Analysis

Production builds include bundle analysis:

```bash
# Production build with analysis
pnpm final:prod

# Manual bundle analysis
pnpm analyze:web
```

### Lighthouse Integration

Automatic performance validation:

```bash
# Run with performance checks
pnpm final:prod --verbose

# Manual lighthouse audit
pnpm perf:lighthouse
```

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   ```bash
   # Check configuration
   pnpm check:env
   
   # Validate specific variables
   echo $SUPABASE_URL
   ```

2. **Database Connection Failures**
   ```bash
   # Test database connection
   pnpm db:studio
   
   # Check health endpoint
   curl https://your-app.vercel.app/api/health
   ```

3. **Build Failures**
   ```bash
   # Clean build cache
   rm -rf apps/web/.next .turbo
   
   # Rebuild
   pnpm build
   ```

4. **Function Deployment Issues**
   ```bash
   # Check Supabase CLI
   supabase --version
   
   # Manual function deployment
   supabase functions deploy scheduled-sync
   ```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Verbose deployment
pnpm final:verbose

# Debug specific phase
pnpm final --validate-only --verbose
```

### Log Files

Deployment logs are stored in:
- `logs/deployment-{timestamp}.log`
- Console output with colored formatting
- Structured JSON logging for CI/CD integration

## Production Checklist

Before production deployment:

- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] API integrations verified
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Rollback plan tested

## Advanced Configuration

### Custom Deployment Hooks

The system supports custom deployment hooks:

```typescript
// In scripts/custom-hooks.ts
export const preDeploymentHook = async () => {
  // Custom pre-deployment logic
};

export const postDeploymentHook = async () => {
  // Custom post-deployment logic
};
```

### Environment-Specific Configuration

```bash
# Development
export DEPLOYMENT_ENV=development
export HEALTH_CHECK_URL=http://localhost:3000

# Staging
export DEPLOYMENT_ENV=staging
export HEALTH_CHECK_URL=https://staging.mysetlist.app

# Production
export DEPLOYMENT_ENV=production
export HEALTH_CHECK_URL=https://mysetlist.app
```

## Support

For deployment issues:

1. Check the deployment logs in `logs/` directory
2. Verify environment configuration with `pnpm check:env`
3. Test health endpoint: `curl https://your-app.vercel.app/api/health`
4. Review the troubleshooting section above

## Contributing

When modifying the deployment system:

1. Test all deployment scenarios
2. Update this documentation
3. Ensure backward compatibility
4. Add appropriate error handling
5. Test rollback functionality

---

**Happy Deploying! 🚀**