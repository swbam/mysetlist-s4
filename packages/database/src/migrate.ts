#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Migration tracking table
const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  executed_at TIMESTAMP DEFAULT NOW()
);
`;

interface MigrationFile {
  filename: string;
  version: string;
  sql: string;
}

class SupabaseMigrationRunner {
  private supabaseUrl: string;
  private supabaseServiceKey: string;
  private client: any;

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    this.client = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async runMigrations(migrationsDir: string) {
    try {
      console.log('🚀 Starting Supabase migrations...');
      
      // Ensure migration table exists
      await this.executeSql(MIGRATION_TABLE_SQL);
      
      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      console.log(`📋 Found ${executedMigrations.length} executed migrations`);
      
      // Get migration files
      const migrationFiles = await this.getMigrationFiles(migrationsDir);
      console.log(`📁 Found ${migrationFiles.length} migration files`);
      
      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(
        m => !executedMigrations.includes(m.version)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ All migrations are up to date!');
        return;
      }
      
      console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);
      
      // Run migrations in order
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      
      console.log('✅ All migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  private async getExecutedMigrations(): Promise<string[]> {
    const { data, error } = await this.client
      .from('schema_migrations')
      .select('version')
      .order('version');

    if (error && error.code !== 'PGRST116') { // Table doesn't exist error
      throw error;
    }

    return data?.map((row: any) => row.version) || [];
  }

  private async getMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    const migrations: MigrationFile[] = [];

    for (const filename of sqlFiles) {
      const filepath = join(migrationsDir, filename);
      const sql = await readFile(filepath, 'utf-8');
      const version = filename.replace('.sql', '');
      
      migrations.push({ filename, version, sql });
    }

    return migrations;
  }

  private async runMigration(migration: MigrationFile) {
    console.log(`\n📝 Running migration: ${migration.filename}`);
    
    try {
      // Execute the migration SQL
      await this.executeSql(migration.sql);
      
      // Record migration as executed
      const { error } = await this.client
        .from('schema_migrations')
        .insert({ version: migration.version });

      if (error) {
        throw error;
      }

      console.log(`✅ Migration ${migration.filename} completed`);
    } catch (error) {
      console.error(`❌ Migration ${migration.filename} failed:`, error);
      throw error;
    }
  }

  private async executeSql(sql: string) {
    // Split SQL into individual statements
    const statements = sql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      // Use Supabase's rpc to execute raw SQL
      const { error } = await this.client.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.error('SQL Error:', error);
        console.error('Statement:', statement);
        throw error;
      }
    }
  }
}

// Create the SQL execution function if it doesn't exist
const CREATE_EXEC_SQL_FUNCTION = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`;

// Run migrations
async function main() {
  const runner = new SupabaseMigrationRunner();
  
  // First, ensure we have the exec_sql function
  try {
    await runner['executeSql'](CREATE_EXEC_SQL_FUNCTION);
  } catch (error) {
    console.log('Note: exec_sql function might already exist or require manual creation');
  }
  
  const migrationsDir = join(__dirname, '..', 'migrations');
  await runner.runMigrations(migrationsDir);
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SupabaseMigrationRunner };