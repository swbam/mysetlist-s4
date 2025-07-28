# Database Migration Strategy - MySetlist

## CRITICAL SITUATION ANALYSIS

The MySetlist project has **dual migration systems** that need reconciliation:

1. **Drizzle Migration** (`packages/database/migrations/0000_ancient_fabian_cortez.sql`)
   - **Complete 75+ table schema** with all required functionality
   - **Target state** representing the desired database structure
   - **Clean, comprehensive** with proper relationships and constraints

2. **Supabase Migrations** (`supabase/migrations/` - 22 files)
   - **Evolutionary migrations** applied over development time
   - **Multiple data integrity fixes** indicating schema drift issues
   - **Current deployed state** with incremental changes

## MIGRATION STRATEGY

### Phase 1: Schema Comparison and Backup

1. **Backup current production database** before any changes
2. **Compare current Supabase schema** against Drizzle target schema
3. **Identify missing tables/fields** that exist in Drizzle but not in current state
4. **Document data transformation requirements**

### Phase 2: Safe Migration Approach

**OPTION A: Incremental Migration (RECOMMENDED)**

- Create new Supabase migrations to bring current schema to Drizzle target
- Apply missing tables/fields through normal migration process
- Preserve existing data while adding new structures
- Test each migration step incrementally

**OPTION B: Complete Reset (HIGH RISK)**

- Only if Option A proves impossible due to conflicts
- Full database reset using Drizzle schema
- Requires complete data export/import
- High risk of data loss

### Phase 3: Reconciliation Steps

1. **Resolve Drizzle/Supabase conflicts**
2. **Update package.json commands** to use consistent migration system
3. **Clean up redundant migration files**
4. **Establish single source of truth** for schema management

### Phase 4: Validation

1. **Test all API routes** against new schema
2. **Verify cron job functionality**
3. **Run database integrity checks**
4. **Performance testing** with new indexes

## IMMEDIATE RISKS TO MITIGATE

### ⚠️ CRITICAL: Do NOT run `supabase db push` until migration strategy is executed

- The `"updateit"` command may cause schema conflicts
- Potential for data corruption or deployment failures
- Need to reconcile dual migration systems first

### Required Before Any Database Changes:

1. **Full database backup**
2. **Schema comparison analysis**
3. **Migration plan approval**
4. **Testing environment validation**

## NEXT STEPS

1. **Execute schema comparison** between current Supabase state and Drizzle target
2. **Create incremental migration files** to bridge the gap safely
3. **Test migration strategy** in development environment
4. **Execute production migration** with rollback plan ready

## FILES REQUIRING ATTENTION

### Critical Migration Files:

- `packages/database/migrations/0000_ancient_fabian_cortez.sql` - Target schema
- `supabase/migrations/20250108_data_cleanup.sql` - Data integrity fixes needed
- `supabase/migrations/20250709002_enable_rls_all_tables.sql` - Security policies
- `supabase/migrations/20250111_add_search_and_user_tables.sql` - Search functionality

### Package.json Commands:

- `"updateit": "supabase db repair && supabase db push"` - ⚠️ DANGEROUS until migration complete
- `"db:reset": "supabase db reset"` - Safe for local development only
- `"db:push": "supabase db push"` - Use only after migration strategy execution

## CONCLUSION

The Drizzle schema contains ALL required functionality for the MySetlist application. The current task is to safely migrate from the evolutionary Supabase state to the clean Drizzle target state without data loss.

**Status: Migration strategy planned, awaiting execution approval.**
