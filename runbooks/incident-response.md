# 🚨 Incident Response Runbook

## Quick Reference

**On-Call Phone**: +1-xxx-xxx-xxxx  
**PagerDuty**: [mysetlist.pagerduty.com](https://mysetlist.pagerduty.com)  
**Status Page**: [status.mysetlist.app](https://status.mysetlist.app)  
**War Room**: Slack #incidents  

## Severity Definitions

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| SEV1 | Complete outage, data loss, security breach | 15 min | Site down, database corruption |
| SEV2 | Major feature broken, partial outage | 30 min | Search broken, voting disabled |
| SEV3 | Minor feature broken, degraded performance | 2 hours | Slow page loads, UI glitches |
| SEV4 | Cosmetic issues, non-critical bugs | Next business day | Typos, styling issues |

## Initial Response Checklist

### 1. Acknowledge Alert (0-5 min)
```bash
# Acknowledge in PagerDuty
# Join #incidents channel
# Post initial status:
"SEV[X] - Investigating [issue description]. IC: @[your-name]"
```

### 2. Assess Impact (5-10 min)
- [ ] Check monitoring dashboards
- [ ] Verify error rates
- [ ] Check user reports
- [ ] Determine affected services
- [ ] Estimate user impact

### 3. Communicate (10-15 min)
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Create incident channel if SEV1/2
- [ ] Assign roles (IC, Comms, Tech Lead)

## Diagnostic Commands

### Health Checks
```bash
# API Health
curl -s https://mysetlist.app/api/health | jq

# Database Health  
curl -s https://mysetlist.app/api/health/db | jq

# Check all endpoints
for endpoint in / /trending /artists /shows; do
  echo "Checking $endpoint..."
  curl -s -o /dev/null -w "%{http_code} - %{time_total}s\n" https://mysetlist.app$endpoint
done
```

### Service Status
```bash
# Vercel deployment status
vercel ls --token=$VERCEL_TOKEN

# Recent deployments
vercel ls --limit=5 --token=$VERCEL_TOKEN

# Check function logs
vercel logs --token=$VERCEL_TOKEN --follow
```

### Database Diagnostics
```bash
# Connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Active queries
psql $DATABASE_URL -c "SELECT pid, age(clock_timestamp(), query_start), usename, query 
FROM pg_stat_activity 
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%' 
ORDER BY query_start desc;"

# Table sizes
psql $DATABASE_URL -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

### Error Investigation
```bash
# Recent errors from Sentry
curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/organizations/mysetlist/issues/?project=$SENTRY_PROJECT&statsPeriod=1h"

# Cloudflare analytics
curl -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/analytics/dashboard?since=-60"
```

## Common Issues & Solutions

### 1. High Error Rate

**Symptoms**: 5xx errors, error rate alerts

**Investigation**:
```bash
# Check recent deployments
vercel ls --limit=10

# Check function errors
vercel logs --error --limit=100

# Database connection issues
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

**Solutions**:
1. Rollback recent deployment: `vercel rollback`
2. Restart stale connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND age(clock_timestamp(), query_start) > interval '5 minutes';`
3. Scale up if resource constrained

### 2. Performance Degradation

**Symptoms**: Slow response times, timeout alerts

**Investigation**:
```bash
# Check slow queries
psql $DATABASE_URL -c "SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"

# CDN cache hit rate
curl -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/analytics/colos"
```

**Solutions**:
1. Clear CDN cache if stale
2. Optimize slow queries
3. Enable emergency caching
4. Scale read replicas

### 3. Complete Outage

**Symptoms**: Site unreachable, all health checks failing

**Investigation**:
```bash
# DNS resolution
dig mysetlist.app

# Cloudflare status
curl https://www.cloudflarestatus.com/api/v2/status.json

# Vercel status
curl https://www.vercel-status.com/api/v2/status.json
```

**Solutions**:
1. Check provider status pages
2. Verify DNS configuration
3. Failover to backup region
4. Activate disaster recovery plan

### 4. Database Issues

**Symptoms**: Connection errors, query timeouts

**Investigation**:
```bash
# Check connections
psql $DATABASE_URL -c "SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;"

# Check locks
psql $DATABASE_URL -c "SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;"
```

**Solutions**:
1. Kill blocking queries
2. Increase connection pool size
3. Failover to read replica
4. Emergency maintenance mode

## Rollback Procedures

### Application Rollback
```bash
# List recent deployments
vercel ls --limit=5

# Rollback to previous
vercel rollback

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Database Rollback
```bash
# Use disaster recovery script
pnpm tsx scripts/disaster-recovery.ts restore --backup-id=<backup-id>
```

### Emergency Cache Clear
```bash
# Cloudflare cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Vercel cache
vercel --prod --force
```

## Communication Templates

### Status Page Updates

**Investigating**
```
We are investigating reports of [issue description]. 
We will provide updates as more information becomes available.
```

**Identified**
```
We have identified the issue causing [problem description]. 
Our team is working on implementing a fix.
```

**Monitoring**
```
A fix has been implemented and we are monitoring the results. 
Service is operating normally.
```

**Resolved**
```
This incident has been resolved. [Brief explanation of what happened and what was done].
We apologize for any inconvenience.
```

### Internal Communication

**Incident Start**
```
@here SEV[X] Incident Declared
Issue: [Description]
Impact: [User impact]
IC: @[incident-commander]
Tech Lead: @[tech-lead]
Comms: @[comms-lead]
Channel: #incident-[timestamp]
```

**Update Template**
```
UPDATE [timestamp]:
- Current Status: [status]
- Actions Taken: [list]
- Next Steps: [list]
- ETA: [estimate]
```

## Post-Incident

### Immediate Actions (same day)
1. Update status page to resolved
2. Send all-clear to stakeholders
3. Document timeline in incident report
4. Schedule post-mortem meeting

### Post-Mortem Template
```markdown
# Incident Post-Mortem: [Title]

**Date**: [Date]
**Duration**: [Duration]
**Severity**: SEV[X]
**Impact**: [User impact]

## Timeline
- [HH:MM] Event
- [HH:MM] Event

## Root Cause
[Detailed explanation]

## Contributing Factors
1. [Factor]
2. [Factor]

## What Went Well
- [Item]
- [Item]

## What Went Wrong
- [Item]
- [Item]

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| [Action] | @[owner] | [date] |

## Lessons Learned
[Key takeaways]
```

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Engineering Lead | [Name] | [Phone/Email] |
| Product Manager | [Name] | [Phone/Email] |
| DevOps Lead | [Name] | [Phone/Email] |
| Security Lead | [Name] | [Phone/Email] |
| Supabase Support | Support | support@supabase.io |
| Vercel Support | Support | support@vercel.com |

## Useful Links

- [Monitoring Dashboard](https://grafana.mysetlist.app)
- [Sentry](https://sentry.io/organizations/mysetlist)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Vercel Dashboard](https://vercel.com/mysetlist)
- [Supabase Dashboard](https://app.supabase.com)
- [GitHub Repo](https://github.com/mysetlist/mysetlist-app)

---

Remember: Stay calm, communicate clearly, and focus on restoring service first. Blame-free post-mortems help us improve.