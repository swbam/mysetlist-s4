#!/usr/bin/env tsx

/**
 * MySetlist Disaster Recovery Script
 *
 * Provides comprehensive backup, restore, and disaster recovery capabilities
 * for the MySetlist application.
 *
 * Usage:
 *   npx tsx scripts/disaster-recovery.ts backup --type=full
 *   npx tsx scripts/disaster-recovery.ts restore --backup-id=20240101-full
 *   npx tsx scripts/disaster-recovery.ts validate --environment=production
 */

import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';

const execAsync = promisify(exec);

interface BackupMetadata {
  id: string;
  type: 'full' | 'incremental' | 'schema';
  timestamp: string;
  size: number;
  tables: string[];
  recordCount: number;
  checksum: string;
}

interface DisasterRecoveryConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  backupDirectory: string;
  retentionDays: number;
  compressionLevel: number;
}

class DisasterRecoveryManager {
  private config: DisasterRecoveryConfig;
  private supabase: any;

  constructor(config: DisasterRecoveryConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }

  /**
   * Create a full backup of the database
   */
  async createFullBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${timestamp}-full`;
    const backupPath = path.join(
      this.config.backupDirectory,
      `${backupId}.json`
    );
    // Get all table names
    const tables = await this.getAllTables();

    const backupData: any = {
      metadata: {
        id: backupId,
        type: 'full',
        timestamp,
        version: '1.0',
        tables: tables,
      },
      data: {},
    };

    let totalRecords = 0;

    // Backup each table
    for (const table of tables) {
      try {
        const { data, error } = await this.supabase.from(table).select('*');

        if (error) {
          backupData.data[`${table}_error`] = error.message;
          continue;
        }

        backupData.data[table] = data || [];
        totalRecords += (data || []).length;
      } catch (tableError) {
        backupData.data[`${table}_error`] = tableError.message;
      }
    }

    // Update metadata
    backupData.metadata.recordCount = totalRecords;
    backupData.metadata.size = JSON.stringify(backupData).length;
    backupData.metadata.checksum = await this.calculateChecksum(
      JSON.stringify(backupData)
    );

    // Save backup file
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    // Compress if enabled
    if (this.config.compressionLevel > 0) {
      await this.compressBackup(backupPath);
    }

    // Store backup metadata
    await this.storeBackupMetadata(backupData.metadata);

    return backupId;
  }

  /**
   * Create an incremental backup (last 7 days of changes)
   */
  async createIncrementalBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${timestamp}-incremental`;
    const backupPath = path.join(
      this.config.backupDirectory,
      `${backupId}.json`
    );
    const cutoffDate = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const tables = await this.getTablesWithTimestamps();

    const backupData: any = {
      metadata: {
        id: backupId,
        type: 'incremental',
        timestamp,
        cutoffDate,
        version: '1.0',
        tables: tables,
      },
      data: {},
    };

    let totalRecords = 0;

    for (const table of tables) {
      try {
        // Try updated_at first, then created_at
        let query = this.supabase.from(table).select('*');

        try {
          query = query.gte('updated_at', cutoffDate);
        } catch {
          query = query.gte('created_at', cutoffDate);
        }

        const { data, error } = await query.limit(10000);

        if (error) {
          continue;
        }

        if (data && data.length > 0) {
          backupData.data[table] = data;
          totalRecords += data.length;
        }
      } catch (_tableError) {}
    }

    // Update metadata
    backupData.metadata.recordCount = totalRecords;
    backupData.metadata.size = JSON.stringify(backupData).length;
    backupData.metadata.checksum = await this.calculateChecksum(
      JSON.stringify(backupData)
    );

    // Save backup file
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    // Store backup metadata
    await this.storeBackupMetadata(backupData.metadata);

    return backupId;
  }

  /**
   * Restore from a backup
   */
  async restoreFromBackup(
    backupId: string,
    options: { dryRun?: boolean; tables?: string[] } = {}
  ): Promise<void> {
    const backupPath = path.join(
      this.config.backupDirectory,
      `${backupId}.json`
    );

    if (options.dryRun) {
    }
    // Check if backup file exists
    const backupExists = await fs
      .access(backupPath)
      .then(() => true)
      .catch(() => false);
    if (!backupExists) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Load backup data
    const backupContent = await fs.readFile(backupPath, 'utf8');
    const backup = JSON.parse(backupContent);

    // Verify backup integrity
    const calculatedChecksum = await this.calculateChecksum(
      JSON.stringify(backup)
    );
    if (
      backup.metadata.checksum &&
      backup.metadata.checksum !== calculatedChecksum
    ) {
      throw new Error('Backup file integrity check failed');
    }

    if (options.dryRun) {
      return;
    }

    const tablesToRestore =
      options.tables ||
      Object.keys(backup.data).filter((key) => !key.endsWith('_error'));

    for (const table of tablesToRestore) {
      if (!backup.data[table]) {
        continue;
      }
      // Clear existing data
      const { error: deleteError } = await this.supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteError) {
      }

      // Insert backup data in batches
      const batchSize = 1000;
      const records = backup.data[table];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const { error: insertError } = await this.supabase
          .from(table)
          .insert(batch);

        if (insertError) {
          throw insertError;
        }
      }
    }

    // Log restore completion
    await this.logRestoreOperation(backupId, tablesToRestore);
  }

  /**
   * Validate system integrity and performance
   */
  async validateSystem(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const { data, error } = await this.supabase
        .from('artists')
        .select('count')
        .limit(1);

      if (error) {
        issues.push(`Database connectivity failed: ${error.message}`);
      } else {
      }
      const criticalTables = [
        'users',
        'artists',
        'venues',
        'shows',
        'setlists',
      ];

      for (const table of criticalTables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('id')
            .limit(1);

          if (error) {
            issues.push(
              `Critical table ${table} is not accessible: ${error.message}`
            );
          } else if (!data || data.length === 0) {
            issues.push(`Critical table ${table} is empty`);
          } else {
          }
        } catch (tableError) {
          issues.push(`Error checking table ${table}: ${tableError.message}`);
        }
      }

      // Test Spotify API
      try {
        const spotifyResponse = await fetch(
          'https://accounts.spotify.com/api/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          }
        );

        if (spotifyResponse.ok) {
        } else {
          issues.push('Spotify API connectivity failed');
        }
      } catch (spotifyError) {
        issues.push(`Spotify API test failed: ${spotifyError.message}`);
      }
      try {
        const backupFiles = await fs.readdir(this.config.backupDirectory);
        const recentBackups = backupFiles.filter((file) => {
          const fileDate = new Date(file.split('-')[0]);
          const daysSinceBackup =
            (Date.now() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceBackup <= 7;
        });

        if (recentBackups.length === 0) {
          issues.push('No recent backups found (within 7 days)');
        } else {
        }
      } catch (backupError) {
        issues.push(`Backup directory check failed: ${backupError.message}`);
      }

      const healthy = issues.length === 0;

      if (issues.length > 0) {
        issues.forEach((_issue, _index) => {});
      }

      return { healthy, issues };
    } catch (error) {
      return {
        healthy: false,
        issues: [`System validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    const backupFiles = await fs.readdir(this.config.backupDirectory);
    const cutoffDate = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    );

    let _deletedCount = 0;

    for (const file of backupFiles) {
      try {
        const filePath = path.join(this.config.backupDirectory, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          _deletedCount++;
        }
      } catch (_fileError) {}
    }
  }

  // Helper methods

  private async getAllTables(): Promise<string[]> {
    const { data, error } = await this.supabase.rpc('get_schema_tables');

    if (error) {
      // Fallback to known tables
      return [
        'users',
        'artists',
        'venues',
        'shows',
        'setlists',
        'songs',
        'setlist_songs',
        'votes',
        'user_follows_artists',
        'user_show_attendance',
        'artist_stats',
        'venue_stats',
        'show_stats',
        'backup_logs',
        'health_logs',
      ];
    }

    return data || [];
  }

  private async getTablesWithTimestamps(): Promise<string[]> {
    // Return tables that likely have timestamp fields
    return [
      'users',
      'artists',
      'venues',
      'shows',
      'setlists',
      'songs',
      'setlist_songs',
      'votes',
      'user_follows_artists',
      'user_show_attendance',
    ];
  }

  private async calculateChecksum(data: string): Promise<string> {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(data).digest('hex');
  }

  private async compressBackup(filePath: string): Promise<void> {
    try {
      await execAsync(`gzip -${this.config.compressionLevel} "${filePath}"`);
    } catch (_error) {}
  }

  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    try {
      await this.supabase.from('backup_logs').insert({
        backup_id: metadata.id,
        backup_type: metadata.type,
        status: 'completed',
        record_count: metadata.recordCount,
        backup_size_mb: Math.round((metadata.size / 1024 / 1024) * 100) / 100,
        tables_backed_up: metadata.tables,
        checksum: metadata.checksum,
        created_at: metadata.timestamp,
      });
    } catch (_error) {}
  }

  private async logRestoreOperation(
    backupId: string,
    tables: string[]
  ): Promise<void> {
    try {
      await this.supabase.from('restore_logs').insert({
        backup_id: backupId,
        tables_restored: tables,
        status: 'completed',
        restored_at: new Date().toISOString(),
      });
    } catch (_error) {}
  }
}

// CLI Configuration
program
  .name('disaster-recovery')
  .description('MySetlist Disaster Recovery Management')
  .version('1.0.0');

program
  .command('backup')
  .description('Create a database backup')
  .option(
    '-t, --type <type>',
    'Backup type (full|incremental|schema)',
    'incremental'
  )
  .action(async (options) => {
    const config: DisasterRecoveryConfig = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      backupDirectory: process.env.BACKUP_DIRECTORY || './backups',
      retentionDays: Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: Number.parseInt(
        process.env.BACKUP_COMPRESSION_LEVEL || '6'
      ),
    };

    const manager = new DisasterRecoveryManager(config);

    try {
      let _backupId: string;

      switch (options.type) {
        case 'full':
          _backupId = await manager.createFullBackup();
          break;
        case 'incremental':
          _backupId = await manager.createIncrementalBackup();
          break;
        default:
          throw new Error(`Unsupported backup type: ${options.type}`);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

program
  .command('restore')
  .description('Restore from a backup')
  .requiredOption('-b, --backup-id <id>', 'Backup ID to restore from')
  .option('--dry-run', 'Validate backup without making changes')
  .option('--tables <tables>', 'Comma-separated list of tables to restore')
  .action(async (options) => {
    const config: DisasterRecoveryConfig = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      backupDirectory: process.env.BACKUP_DIRECTORY || './backups',
      retentionDays: Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: Number.parseInt(
        process.env.BACKUP_COMPRESSION_LEVEL || '6'
      ),
    };

    const manager = new DisasterRecoveryManager(config);

    try {
      const restoreOptions: any = {
        dryRun: options.dryRun,
      };

      if (options.tables) {
        restoreOptions.tables = options.tables.split(',').map((t) => t.trim());
      }

      await manager.restoreFromBackup(options.backupId, restoreOptions);
    } catch (_error) {
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate system health and integrity')
  .action(async () => {
    const config: DisasterRecoveryConfig = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      backupDirectory: process.env.BACKUP_DIRECTORY || './backups',
      retentionDays: Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: Number.parseInt(
        process.env.BACKUP_COMPRESSION_LEVEL || '6'
      ),
    };

    const manager = new DisasterRecoveryManager(config);

    try {
      const result = await manager.validateSystem();

      if (!result.healthy) {
        process.exit(1);
      }
    } catch (_error) {
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Clean up old backups')
  .action(async () => {
    const config: DisasterRecoveryConfig = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      backupDirectory: process.env.BACKUP_DIRECTORY || './backups',
      retentionDays: Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: Number.parseInt(
        process.env.BACKUP_COMPRESSION_LEVEL || '6'
      ),
    };

    const manager = new DisasterRecoveryManager(config);

    try {
      await manager.cleanupOldBackups();
    } catch (_error) {
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}
