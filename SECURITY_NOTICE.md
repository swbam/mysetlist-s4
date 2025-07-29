# Security Notice - Cron Secret

## Issue
The cron secret value `6155002300` is hardcoded in several migration files:
- `supabase/migrations/20250729_update_cron_jobs_to_vercel_app.sql`
- `supabase/migrations/20250122_configure_app_settings.sql`
- `supabase/migrations/20250122_cleanup_cron_jobs_final.sql`

## Risk
This exposes the authentication secret in the git repository, allowing unauthorized access to cron endpoints.

## Remediation
1. **Immediate Action**: After deployment, run the script to update the cron secret:
   ```bash
   # Set your actual secret from environment
   export CRON_SECRET="your-secure-secret-here"
   
   # Run the update script
   psql $DATABASE_URL < scripts/update-cron-secret.sql
   ```

2. **Verify Update**:
   ```sql
   SELECT key, value FROM app_settings WHERE key = 'cron_secret';
   ```

3. **Update Environment**: Ensure `CRON_SECRET` in your `.env` file matches the new value.

4. **Rotate Regularly**: Consider rotating this secret periodically for enhanced security.

## Prevention
For future migrations:
- Never hardcode secrets in migration files
- Use placeholder values with clear documentation
- Implement post-deployment scripts for secret configuration
- Consider using Supabase Vault for secret management