# 🚀 MySetlist CI/CD Pipeline Documentation

## Overview

MySetlist uses a comprehensive CI/CD pipeline built with GitHub Actions, providing automated testing, security scanning, performance monitoring, and deployment capabilities. This documentation covers the complete setup and operation of the pipeline.

## 🏗️ Pipeline Architecture

### Workflows Overview

| Workflow                      | Trigger                         | Purpose                                                            |
| ----------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `ci-cd-production.yml`        | Push to main/production, PRs    | Main CI/CD pipeline with full validation and deployment            |
| `pr-validation.yml`           | Pull requests                   | PR validation, preview deployments, and automated feedback         |
| `hotfix-deployment.yml`       | Hotfix branches, manual trigger | Emergency deployment with minimal validation                       |
| `scheduled-maintenance.yml`   | Scheduled cron jobs             | Automated health checks, dependency audits, performance monitoring |
| `setup-branch-protection.yml` | Manual trigger                  | Repository security configuration and branch protection setup      |

### Pipeline Stages

```mermaid
graph TD
    A[Code Push/PR] --> B[Change Detection]
    B --> C[Build & TypeCheck]
    B --> D[Lint & Format]
    B --> E[Security Scan]
    C --> F[Unit Tests]
    C --> G[Integration Tests]
    C --> H[E2E Tests]
    F --> I[Staging Deploy]
    G --> I
    H --> I
    E --> I
    I --> J[Production Deploy]
    J --> K[Post-Deploy Monitoring]
```

## 🔧 Setup Instructions

### 1. Repository Secrets Configuration

Configure the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

#### Required Secrets

```bash
# Vercel Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_organization_id
VERCEL_PROJECT_ID=your_project_id

# Database
DATABASE_URL=postgresql://user:password@host:port/database
TEST_DATABASE_URL=postgresql://user:password@host:port/test_database

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key

# Monitoring & Notifications
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SLACK_WEBHOOK_URL=your_slack_webhook_url
CODECOV_TOKEN=your_codecov_token

# Performance & Analytics
TURBO_TOKEN=your_turbo_token
```

#### Repository Variables

Configure these variables in `Settings > Secrets and variables > Actions > Variables`:

```bash
TURBO_TEAM=your_turbo_team_name
```

### 2. Branch Protection Setup

Run the branch protection setup workflow:

1. Go to `Actions` tab in your repository
2. Select `🛡️ Setup Branch Protection & Repository Settings`
3. Click `Run workflow`
4. Check `Apply branch protection rules`
5. Click `Run workflow`

This configures:

- **Main branch**: 1 approval required, code owner reviews
- **Production branch**: 2 approvals required, extended validation
- **Repository settings**: Optimized merge strategies
- **CODEOWNERS**: Automated review assignments

### 3. Environment Configuration

#### Production Environment

Create a production environment in GitHub:

1. Go to `Settings > Environments`
2. Click `New environment`
3. Name: `production`
4. Add protection rules:
   - Required reviewers (team leads)
   - Deployment branches: `production` only
5. Add environment secrets (same as repository secrets)

#### Staging Environment

Create a staging environment:

1. Name: `staging`
2. Protection rules:
   - Required reviewers (optional)
   - Deployment branches: `main` and `production`

## 🔄 Workflow Details

### Main CI/CD Pipeline (`ci-cd-production.yml`)

**Triggers:**

- Push to `main` or `production` branches
- Pull requests targeting `main` or `production`
- Manual workflow dispatch

**Stages:**

1. **Change Detection** - Identifies modified components to optimize pipeline execution
2. **Build & Validation** - TypeScript compilation, linting, and build verification
3. **Testing Suite** - Unit tests, integration tests, E2E tests, accessibility tests
4. **Security Scanning** - Dependency audit, vulnerability scanning, secrets detection
5. **Performance Analysis** - Lighthouse audits, bundle size analysis
6. **Staging Deployment** - Preview deployment with health checks
7. **Production Deployment** - Production deployment with comprehensive validation
8. **Post-Deployment Monitoring** - Health checks, performance validation, alerting

**Key Features:**

- **Parallel execution** for independent tasks
- **Smart caching** for dependencies and build artifacts
- **Performance budgets** enforcement
- **Automatic rollback** on deployment failures
- **Comprehensive reporting** and notifications

### PR Validation Pipeline (`pr-validation.yml`)

**Triggers:**

- Pull request opened, synchronized, or reopened
- Pull request reviews submitted

**Features:**

- **Change analysis** with complexity scoring
- **Preview deployments** for every PR
- **Security scanning** for sensitive changes
- **Performance impact assessment**
- **Automated PR comments** with validation results
- **Environment cleanup** on PR closure

**PR Comment Example:**

```markdown
## 🔍 PR Validation Results

### 📊 Change Analysis

- **Complexity Score**: 4/10
- **Performance Impact**: medium
- **Breaking Changes**: ✅ No
- **Security Review**: 🔒 Required

### ✅ Test Results

- **Validation Tests**: ✅ Passed
- **Security Analysis**: 🔒 Passed

### 🚀 Preview Deployment

🌐 **Live Preview**: https://preview-url.vercel.app
```

### Hotfix Pipeline (`hotfix-deployment.yml`)

**Triggers:**

- Push to `hotfix/**` branches
- Manual workflow dispatch for emergencies

**Features:**

- **Minimal validation** for emergency deployments
- **Critical tests only** option
- **Immediate rollback** capability
- **Extended monitoring** post-deployment
- **Emergency notifications** to team

**Emergency Deployment Process:**

1. Create hotfix branch: `hotfix/critical-security-fix`
2. Pipeline automatically triggers
3. Minimal build and critical tests
4. Direct production deployment
5. 5-minute monitoring period
6. Automatic rollback if issues detected

### Scheduled Maintenance (`scheduled-maintenance.yml`)

**Schedule:**

- **Daily**: Health checks at 6 AM UTC
- **Weekly**: Dependency audit on Mondays at 9 AM UTC
- **Monthly**: Performance audit on 1st of month at 10 AM UTC

**Maintenance Tasks:**

- **Health monitoring** of all critical endpoints
- **Dependency vulnerability scanning**
- **Performance baseline tracking**
- **Database health checks**
- **Automated reporting** and alerting

## 📊 Performance & Quality Gates

### Performance Budgets

```javascript
{
  "performance": 85,        // Lighthouse performance score
  "accessibility": 90,      // Accessibility score
  "best-practices": 90,     // Best practices score
  "seo": 90,               // SEO score
  "lcp": 2500,             // Largest Contentful Paint (ms)
  "fcp": 2000,             // First Contentful Paint (ms)
  "cls": 0.1,              // Cumulative Layout Shift
  "tbt": 200,              // Total Blocking Time (ms)
  "si": 3000,              // Speed Index (ms)
  "tti": 3000              // Time to Interactive (ms)
}
```

### Security Requirements

- **Zero critical vulnerabilities** in dependencies
- **Maximum 5 high-severity vulnerabilities**
- **Code scanning** with Semgrep and CodeQL
- **Secrets detection** with Gitleaks
- **Security review required** for auth/middleware changes

### Code Quality Standards

- **100% TypeScript compliance** - No `any` types allowed
- **90%+ test coverage** for new code
- **ESLint compliance** with zero errors
- **Prettier formatting** enforced
- **Bundle size monitoring** with thresholds

## 🚨 Monitoring & Alerting

### Slack Notifications

The pipeline sends notifications for:

- **Deployment success/failure**
- **Security vulnerabilities detected**
- **Performance degradation**
- **Health check failures**
- **Emergency deployments**

### Notification Channels

```bash
# Critical alerts (immediate attention)
🚨 Production deployment failures
🔒 Critical security vulnerabilities
⚡ Performance budget violations

# Warning alerts (next business day)
⚠️ High-severity vulnerabilities
📈 Performance degradation
🧪 Staging deployment issues

# Info alerts (weekly summary)
ℹ️ Dependency updates available
📊 Performance trends
✅ Maintenance completed
```

### Health Check Endpoints

The pipeline monitors these critical endpoints:

```bash
# Application health
GET /api/health/comprehensive
GET /api/health/db

# Feature availability
GET /api/trending
GET /api/search
GET /api/artists/search

# Core pages
GET /
GET /trending
GET /artists
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures

**TypeScript Errors:**

```bash
# Local fix
pnpm typecheck
# Fix errors, then commit
```

**Dependency Issues:**

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 2. Test Failures

**Unit Test Failures:**

```bash
# Run tests locally
pnpm test
# Check test output for specific failures
```

**E2E Test Failures:**

```bash
# Run E2E tests locally
pnpm exec playwright test
# Check screenshots in test-results/
```

#### 3. Deployment Issues

**Vercel Deployment Fails:**

- Check Vercel dashboard for detailed logs
- Verify environment variables are set
- Check build output for errors

**Health Check Failures:**

- Verify database connectivity
- Check API endpoint responses
- Review application logs

#### 4. Security Scan Failures

**Dependency Vulnerabilities:**

```bash
# Check vulnerabilities
pnpm audit
# Update dependencies
pnpm update
```

**Code Security Issues:**

- Review Semgrep findings in Security tab
- Fix identified security patterns
- Request security team review if needed

### Manual Interventions

#### Emergency Rollback

If automated rollback fails:

```bash
# Via Vercel CLI
vercel --prod alias set <previous-deployment-url> mysetlist-sonnet.vercel.app

# Via GitHub Actions
# 1. Go to Actions tab
# 2. Run "Hotfix Emergency Deployment"
# 3. Use previous known-good commit
```

#### Skip CI for Documentation

```bash
git commit -m "docs: update README [skip ci]"
```

#### Force Deployment

Use manual workflow dispatch with `force_deploy: true` for critical fixes that don't pass all checks.

## 🎯 Best Practices

### Development Workflow

1. **Feature Development:**

   ```bash
   git checkout -b feature/new-feature
   # Develop feature
   git push origin feature/new-feature
   # Create PR to main
   ```

2. **Hotfix Workflow:**

   ```bash
   git checkout -b hotfix/critical-fix
   # Fix critical issue
   git push origin hotfix/critical-fix
   # Emergency pipeline triggers automatically
   ```

3. **Production Release:**
   ```bash
   # After thorough testing in staging
   git checkout production
   git merge main
   git push origin production
   # Production deployment triggers
   ```

### Code Review Guidelines

- **Security changes** require security team review
- **Performance-critical changes** require performance testing
- **Database changes** require migration review
- **API changes** require backward compatibility check

### Testing Strategy

- **Unit tests** for business logic and utilities
- **Integration tests** for API endpoints and database operations
- **E2E tests** for critical user journeys
- **Performance tests** for performance-critical features
- **Accessibility tests** for UI components

## 📈 Metrics & Analytics

### Pipeline Metrics

- **Build time trends** - Track build performance over time
- **Test success rates** - Monitor test reliability
- **Deployment frequency** - Track development velocity
- **Mean time to recovery** - Measure incident response

### Application Metrics

- **Core Web Vitals** - LCP, FID, CLS tracking
- **API response times** - Database and external API performance
- **Error rates** - Application stability monitoring
- **User engagement** - Feature usage analytics

### Reporting

- **Weekly CI/CD reports** - Pipeline health and trends
- **Monthly performance reviews** - Application performance analysis
- **Quarterly security audits** - Comprehensive security assessment

## 🔗 Resources

### Documentation Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Playwright Testing Documentation](https://playwright.dev/docs/intro)

### Internal Resources

- **Runbook**: `/infrastructure/operational-runbooks.md`
- **Deployment Guide**: `/DEPLOYMENT-GUIDE.md`
- **Performance Monitoring**: `/infrastructure/monitoring/`
- **Security Policies**: `/docs/security/`

### Support Contacts

- **CI/CD Issues**: DevOps team
- **Security Concerns**: Security team
- **Performance Problems**: Performance team
- **Infrastructure**: Platform team

---

**Last Updated**: Current deployment
**Version**: 1.0.0
**Maintained by**: DevOps Team
