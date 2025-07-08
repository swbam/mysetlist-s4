#!/usr/bin/env node
import 'dotenv/config';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, readdir } from 'fs/promises';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationFile {
  filename: string;
  version: string;
  sql: string;
}

class DirectMigrationRunner {
  private sql: any;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, {
      max: 1,
      ssl: 'require',
    });
  }

  async runMigrations(migrationsDir: string) {
    try {
      console.log('🚀 Starting database migrations...');

      // Create migrations table
      await this.sql`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Get executed migrations
      const executedRows = await this.sql`
        SELECT version FROM schema_migrations ORDER BY version
      `;
      const executedMigrations = executedRows.map((row: any) => row.version);
      console.log(`📋 Found ${executedMigrations.length} executed migrations`);

      // Get migration files
      const migrationFiles = await this.getMigrationFiles(migrationsDir);
      console.log(`📁 Found ${migrationFiles.length} migration files`);

      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(
        (m) => !executedMigrations.includes(m.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ All migrations are up to date!');
        await this.sql.end();
        return;
      }

      console.log(
        `🔄 Running ${pendingMigrations.length} pending migrations...`
      );

      // Run migrations in order
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }

      console.log('✅ All migrations completed successfully!');
      await this.sql.end();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.sql.end();
      process.exit(1);
    }
  }

  private async getMigrationFiles(
    migrationsDir: string
  ): Promise<MigrationFile[]> {
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

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

    const transaction = this.sql.begin(async (sql: any) => {
      try {
        // Execute the migration SQL
        await sql.unsafe(migration.sql);

        // Record migration as executed
        await sql`
          INSERT INTO schema_migrations (version) VALUES (${migration.version})
        `;

        console.log(`✅ Migration ${migration.filename} completed`);
      } catch (error) {
        console.error(`❌ Migration ${migration.filename} failed:`, error);
        throw error; // This will rollback the transaction
      }
    });

    await transaction;
  }
}

// Run migrations
async function main() {
  const connectionString =
    process.env['DATABASE_URL'] || process.env['POSTGRES_URL'];

  if (!connectionString) {
    console.error(
      '❌ Missing DATABASE_URL or POSTGRES_URL environment variable'
    );
    process.exit(1);
  }

  const runner = new DirectMigrationRunner(connectionString);
  const migrationsDir = join(__dirname, '..', 'migrations');
  await runner.runMigrations(migrationsDir);
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DirectMigrationRunner };
