# MySetlist Operational Runbooks

## Table of Contents
1. [Incident Response Procedures](#incident-response)
2. [Deployment Procedures](#deployment)
3. [Monitoring and Alerting](#monitoring)
4. [Disaster Recovery](#disaster-recovery)
5. [Performance Troubleshooting](#performance)
6. [Security Incident Response](#security)
7. [Database Operations](#database)
8. [External API Management](#external-apis)

---

## Incident Response Procedures {#incident-response}

### Severity Levels

#### P0 - Critical (Response Time: 5 minutes)
- Application completely down
- Major security breach
- Data loss incident
- User authentication failure affecting >90% of users

#### P1 - High (Response Time: 15 minutes)
- Significant feature degradation
- API response time >5 seconds
- Database connection issues
- External API failures affecting core functionality

#### P2 - Medium (Response Time: 2 hours)
- Minor feature issues
- Non-critical API failures
- Performance degradation <50%
- UI/UX issues affecting <10% of users

#### P3 - Low (Response Time: 24 hours)
- Cosmetic issues
- Documentation updates
- Feature requests
- Minor optimization opportunities

### Incident Response Steps

1. **Acknowledge** (Within 2 minutes)
   ```bash
   # Update incident status
   curl -X POST https://mysetlist-sonnet.vercel.app/api/admin/incidents \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"status": "acknowledged", "assignee": "your-name"}'
   ```

2. **Assess** (Within 5 minutes)
   ```bash
   # Check system health
   curl -s https://mysetlist-sonnet.vercel.app/api/health/comprehensive | jq
   
   # Check monitoring dashboard
   curl -s https://mysetlist-sonnet.vercel.app/api/monitoring/dashboard | jq
   ```

3. **Mitigate** (Within 15 minutes)
   - Identify root cause
   - Implement temporary fix
   - Document actions taken

4. **Communicate** (Ongoing)
   - Update stakeholders
   - Provide regular status updates
   - Maintain incident log

5. **Resolve** (Variable)
   - Implement permanent fix
   - Verify resolution
   - Update documentation

6. **Post-Mortem** (Within 48 hours)
   - Document lessons learned
   - Identify preventive measures
   - Update runbooks

### Emergency Contacts

- **Primary On-Call**: [Your Name] - [Your Phone]
- **Secondary On-Call**: [Backup Name] - [Backup Phone]
- **Technical Lead**: [Lead Name] - [Lead Phone]
- **Product Manager**: [PM Name] - [PM Phone]

---

## Deployment Procedures {#deployment}

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Environment variables updated
- [ ] Database migrations ready
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

### Deployment Process

1. **Automated Deployment**
   ```bash
   # Run the comprehensive deployment script
   ./infrastructure/deploy-production.sh
   ```

2. **Manual Deployment** (If automation fails)
   ```bash
   # Switch to web directory
   cd apps/web
   
   # Build and deploy
   vercel --prod --confirm
   
   # Verify deployment
   curl -f https://mysetlist-sonnet.vercel.app/api/health/comprehensive
   ```

3. **Rollback Procedure**
   ```bash
   # Get previous deployment
   vercel ls --scope swbams-projects | grep mysetlist-sonnet
   
   # Rollback to previous version
   vercel alias set [PREVIOUS_DEPLOYMENT_URL] mysetlist-sonnet.vercel.app
   ```

### Post-Deployment Verification

1. **Health Checks**
   ```bash
   # Comprehensive health check
   curl -s https://mysetlist-sonnet.vercel.app/api/health/comprehensive | jq '.status'
   
   # Performance test
   lighthouse https://mysetlist-sonnet.vercel.app --output json
   ```

2. **Smoke Tests**
   ```bash
   # Test critical endpoints
   curl -f https://mysetlist-sonnet.vercel.app/api/trending
   curl -f https://mysetlist-sonnet.vercel.app/api/search
   curl -f https://mysetlist-sonnet.vercel.app/api/artists/search
   ```

3. **User Acceptance Testing**
   - Verify login/logout flow
   - Test search functionality
   - Validate voting system
   - Check responsive design

---

## Monitoring and Alerting {#monitoring}

### Key Performance Indicators (KPIs)

#### Availability
- **Target**: 99.9% uptime
- **Measurement**: HTTP 200 responses / total requests
- **Alert Threshold**: <99.5% over 5 minutes

#### Response Time
- **Target**: <2 seconds average
- **Measurement**: Server response time
- **Alert Threshold**: >5 seconds for 2 minutes

#### Error Rate
- **Target**: <0.1% error rate
- **Measurement**: HTTP 5xx responses / total requests
- **Alert Threshold**: >1% over 5 minutes

### Monitoring Endpoints

1. **Health Check**
   ```bash
   # Basic health check
   curl https://mysetlist-sonnet.vercel.app/api/health
   
   # Comprehensive health check
   curl https://mysetlist-sonnet.vercel.app/api/health/comprehensive
   ```

2. **Monitoring Dashboard**
   ```bash
   # Get real-time metrics
   curl https://mysetlist-sonnet.vercel.app/api/monitoring/dashboard
   ```

3. **Performance Metrics**
   ```bash
   # Get performance data
   curl https://mysetlist-sonnet.vercel.app/api/analytics/performance
   ```

### Alert Configuration

#### Critical Alerts (Immediate Response)
- Application down (all endpoints returning 5xx)
- Database connection failure
- External API complete failure
- Security breach detected

#### Warning Alerts (Response within 1 hour)
- High response time (>3 seconds)
- High error rate (>0.5%)
- Memory usage >80%
- Disk usage >85%

#### Info Alerts (Response within 4 hours)
- Deployment completed
- Performance degradation
- External API rate limiting
- Cache miss rate >20%

---

## Disaster Recovery {#disaster-recovery}

### Backup Strategy

#### Database Backups
- **Frequency**: Every 6 hours
- **Retention**: 30 days
- **Storage**: Supabase automatic backups + manual exports
- **Verification**: Weekly restore tests

#### Application Backups
- **Frequency**: Every deployment
- **Retention**: 10 deployments
- **Storage**: Vercel deployment history
- **Verification**: Automated rollback testing

### Recovery Procedures

#### Database Recovery
1. **Identify Data Loss Scope**
   ```sql
   -- Check last backup timestamp
   SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1;
   
   -- Verify data integrity
   SELECT COUNT(*) FROM users WHERE created_at > '2024-01-01';
   ```

2. **Restore from Backup**
   ```bash
   # Contact Supabase support or use dashboard
   # Restore from specific backup point
   supabase db reset --linked
   ```

3. **Verify Recovery**
   ```bash
   # Test critical functionality
   curl -f https://mysetlist-sonnet.vercel.app/api/health/db
   ```

#### Application Recovery
1. **Identify Last Working Version**
   ```bash
   vercel ls --scope swbams-projects | grep mysetlist-sonnet | head -10
   ```

2. **Rollback to Stable Version**
   ```bash
   vercel alias set [STABLE_DEPLOYMENT_URL] mysetlist-sonnet.vercel.app
   ```

3. **Verify Functionality**
   ```bash
   # Run comprehensive health check
   curl -s https://mysetlist-sonnet.vercel.app/api/health/comprehensive
   ```

### Recovery Time Objectives (RTO)

- **Critical Systems**: 15 minutes
- **Database**: 30 minutes
- **Full Application**: 60 minutes
- **Complete Infrastructure**: 4 hours

### Recovery Point Objectives (RPO)

- **User Data**: 6 hours
- **Application State**: 1 hour
- **Configuration**: 24 hours
- **Logs**: 1 hour

---

## Performance Troubleshooting {#performance}

### Common Performance Issues

#### High Response Time
1. **Check Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   ```

2. **Check External API Performance**
   ```bash
   # Test API response times
   curl -w "@curl-format.txt" -s https://api.spotify.com/v1/search?q=test
   ```

3. **Check Application Performance**
   ```bash
   # Run performance audit
   lighthouse https://mysetlist-sonnet.vercel.app --output json
   ```

#### High Memory Usage
1. **Check Memory Metrics**
   ```bash
   curl -s https://mysetlist-sonnet.vercel.app/api/monitoring/dashboard | jq '.infrastructure.memory_usage'
   ```

2. **Identify Memory Leaks**
   ```javascript
   // Add to application code
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log('Memory usage:', usage);
   }, 60000);
   ```

#### Database Connection Issues
1. **Check Connection Pool**
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

2. **Reset Connections**
   ```bash
   # Restart application (via redeployment)
   vercel --prod --confirm
   ```

---

## Security Incident Response {#security}

### Security Monitoring

#### Automated Security Checks
- SQL injection detection
- Rate limiting enforcement
- Authentication bypass attempts
- Suspicious API access patterns

#### Manual Security Audits
- Monthly dependency vulnerability scans
- Quarterly penetration testing
- Annual security architecture review

### Incident Response

#### Suspected Breach
1. **Immediate Actions**
   - Identify affected systems
   - Isolate compromised components
   - Document all evidence
   - Notify security team

2. **Investigation**
   - Analyze logs and metrics
   - Determine breach scope
   - Identify attack vectors
   - Collect forensic evidence

3. **Containment**
   - Implement security patches
   - Reset compromised credentials
   - Update access controls
   - Monitor for continued attacks

4. **Recovery**
   - Verify system integrity
   - Restore from clean backups
   - Implement additional security measures
   - Conduct post-incident review

### Security Contacts

- **Security Team**: security@mysetlist.com
- **Legal Team**: legal@mysetlist.com
- **External Security Firm**: [Contact Information]
- **Law Enforcement**: [Contact Information]

---

## Database Operations {#database}

### Routine Maintenance

#### Daily Tasks
- Monitor backup completion
- Check slow query log
- Verify replication status
- Review connection metrics

#### Weekly Tasks
- Analyze query performance
- Update statistics
- Review index usage
- Check disk space

#### Monthly Tasks
- Full database backup verification
- Security audit
- Performance optimization
- Capacity planning review

### Common Database Issues

#### Connection Pool Exhaustion
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '5 minutes';
```

#### Slow Query Performance
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Reset statistics
SELECT pg_stat_reset();
```

#### Database Locks
```sql
-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Kill blocking queries
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE waiting;
```

---

## External API Management {#external-apis}

### API Health Monitoring

#### Spotify API
- **Rate Limits**: 100 requests/minute
- **Monitoring**: Response time, error rate
- **Backup**: Cache popular searches
- **Escalation**: Use cached data if API fails

#### Ticketmaster API
- **Rate Limits**: 200 requests/minute
- **Monitoring**: Response time, error rate
- **Backup**: Graceful degradation
- **Escalation**: Disable event syncing if API fails

#### SetlistFM API
- **Rate Limits**: 50 requests/minute
- **Monitoring**: Response time, error rate
- **Backup**: Use existing setlist data
- **Escalation**: Disable new setlist imports if API fails

### API Failure Responses

#### Complete API Failure
1. **Immediate Response**
   - Switch to cached data
   - Disable real-time features
   - Show user-friendly error messages
   - Alert operations team

2. **Temporary Workarounds**
   - Serve stale data with warnings
   - Implement circuit breaker pattern
   - Queue failed requests for retry
   - Provide manual data entry options

3. **Long-term Solutions**
   - Implement redundant data sources
   - Build comprehensive caching layer
   - Develop offline-first features
   - Create manual override procedures

### API Rate Limiting

#### Detection
```javascript
// Rate limit detection
if (response.status === 429) {
  const retryAfter = response.headers.get('retry-after');
  // Implement exponential backoff
}
```

#### Mitigation
```javascript
// Implement circuit breaker
const circuitBreaker = new CircuitBreaker(apiCall, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

---

## Emergency Procedures Summary

### Quick Reference Commands

```bash
# Health check
curl -s https://mysetlist-sonnet.vercel.app/api/health/comprehensive | jq '.status'

# Rollback deployment
vercel alias set [PREVIOUS_URL] mysetlist-sonnet.vercel.app

# Check logs
vercel logs https://mysetlist-sonnet.vercel.app

# Database connection test
curl -f https://mysetlist-sonnet.vercel.app/api/health/db

# Performance test
lighthouse https://mysetlist-sonnet.vercel.app --output json
```

### Contact Information

- **Primary Engineer**: [Your Name] - [Your Phone]
- **DevOps Team**: devops@mysetlist.com
- **Support Team**: support@mysetlist.com
- **Emergency Hotline**: [Emergency Number]

---

*Last Updated: $(date)*  
*Version: 1.0*  
*Next Review: $(date -d '+3 months')*