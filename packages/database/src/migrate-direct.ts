#!/usr/bin/env node
import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

      // Get migration files
      const migrationFiles = await this.getMigrationFiles(migrationsDir);

      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(
        (m) => !executedMigrations.includes(m.version)
      );

      if (pendingMigrations.length === 0) {
        await this.sql.end();
        return;
      }

      // Run migrations in order
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      await this.sql.end();
    } catch (_error) {
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
    const transaction = this.sql.begin(async (sql: any) => {
      // Execute the migration SQL
      await sql.unsafe(migration.sql);

      // Record migration as executed
      await sql`
          INSERT INTO schema_migrations (version) VALUES (${migration.version})
        `;
    });

    await transaction;
  }
}

// Run migrations
async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
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
