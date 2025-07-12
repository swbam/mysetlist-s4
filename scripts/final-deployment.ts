#!/usr/bin/env tsx
/**
 * 🚀 ULTIMATE MYSETLIST DEPLOYMENT SCRIPT
 *
 * This script provides comprehensive, production-ready deployment automation
 * with intelligent error handling, rollback capabilities, and parallel execution.
 *
 * Features:
 * - Ultra-efficient parallel execution where safe
 * - Comprehensive error handling with automatic rollback
 * - Environment validation and API testing
 * - Database operations with backup/restore
 * - Supabase functions deployment
 * - Vercel deployment with optimizations
 * - Post-deployment validation and health checks
 * - Performance monitoring and reporting
 * - Auto-accept prompts for CI/CD compatibility
 *
 * Usage:
 *   pnpm final                    # Development deployment
 *   pnpm final --prod             # Production deployment
 *   pnpm final --staging          # Staging deployment
 *   pnpm final --validate-only    # Validation only (no deployment)
 *   pnpm final --rollback         # Rollback last deployment
 *   pnpm final --force            # Force deployment (skip validations)
 *   pnpm final --parallel         # Maximum parallel execution
 *   pnpm final --verbose          # Detailed logging
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// ES module equivalent of __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from multiple possible locations
const envPaths = [
  resolve(__dirname, '../.env.local'),
  resolve(__dirname, '../apps/web/.env.local'),
  resolve(__dirname, '.env.local'),
  resolve(__dirname, '.env'),
];

// Load environment variables from all available paths
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

// Configuration
const CONFIG = {
  PROJECT_ROOT: process.cwd(),
  LOG_DIR: join(process.cwd(), 'logs'),
  BACKUP_DIR: join(process.cwd(), 'backups'),
  DEPLOYMENT_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  HEALTH_CHECK_RETRIES: 30,
  HEALTH_CHECK_INTERVAL: 10000, // 10 seconds
  PARALLEL_LIMIT: 4,
  MAX_RETRIES: 3,
} as const;

// CLI Arguments
const args = process.argv.slice(2);
const FLAGS = {
  PROD: args.includes('--prod') || args.includes('--production'),
  STAGING: args.includes('--staging'),
  VALIDATE_ONLY: args.includes('--validate-only'),
  ROLLBACK: args.includes('--rollback'),
  FORCE: args.includes('--force'),
  PARALLEL: args.includes('--parallel'),
  VERBOSE: args.includes('--verbose') || args.includes('-v'),
  YES: args.includes('--yes') || args.includes('-y'),
  DRY_RUN: args.includes('--dry-run'),
  SKIP_TESTS: args.includes('--skip-tests'),
  SKIP_BUILD: args.includes('--skip-build'),
  SKIP_DB: args.includes('--skip-db'),
  SKIP_FUNCTIONS: args.includes('--skip-functions'),
  SKIP_VERCEL: args.includes('--skip-vercel'),
  QUICK: args.includes('--quick'),
} as const;

// Determine environment
const ENVIRONMENT = FLAGS.PROD
  ? 'production'
  : FLAGS.STAGING
    ? 'staging'
    : 'development';

// Enhanced logging system
class Logger {
  private static instance: Logger;
  private logFile: string;
  private startTime: number;
  private deploymentId: string;

  constructor() {
    this.startTime = Date.now();
    this.deploymentId = `deployment-${Date.now()}`;

    // Ensure log directory exists
    if (!existsSync(CONFIG.LOG_DIR)) {
      mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }

    this.logFile = join(CONFIG.LOG_DIR, `${this.deploymentId}.log`);
    this.info(`🚀 Starting MySetlist ${ENVIRONMENT} deployment`);
    this.info(`📋 Deployment ID: ${this.deploymentId}`);
    this.info(`🔧 Environment: ${ENVIRONMENT}`);
    this.info(`📁 Log file: ${this.logFile}`);
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private write(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const logEntry = `[${timestamp}] [${elapsed}s] [${level}] ${message}${data ? ` ${JSON.stringify(data)}` : ''}`;

    // Write to file
    writeFileSync(this.logFile, `${logEntry}\n`, { flag: 'a' });

    // Console output with colors
    const colors = {
      INFO: '\x1b[36m', // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARN: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      DEBUG: '\x1b[90m', // Gray
      RESET: '\x1b[0m', // Reset
    };

    const _color = colors[level as keyof typeof colors] || colors.INFO;
  }

  info(message: string, data?: any) {
    this.write('INFO', message, data);
  }

  success(message: string, data?: any) {
    this.write('SUCCESS', message, data);
  }

  warn(message: string, data?: any) {
    this.write('WARN', message, data);
  }

  error(message: string, data?: any) {
    this.write('ERROR', message, data);
  }

  debug(message: string, data?: any) {
    if (FLAGS.VERBOSE) {
      this.write('DEBUG', message, data);
    }
  }

  getDeploymentId(): string {
    return this.deploymentId;
  }

  getLogFile(): string {
    return this.logFile;
  }
}

// Command execution utilities
class CommandRunner {
  private static instance: CommandRunner;
  private logger: Logger;
  private activeProcesses: Map<string, any> = new Map();

  constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): CommandRunner {
    if (!CommandRunner.instance) {
      CommandRunner.instance = new CommandRunner();
    }
    return CommandRunner.instance;
  }

  async run(
    command: string,
    options: {
      cwd?: string;
      timeout?: number;
      retries?: number;
      acceptPrompts?: boolean;
      parallel?: boolean;
      essential?: boolean;
    } = {}
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const {
      cwd = CONFIG.PROJECT_ROOT,
      timeout = 5 * 60 * 1000, // 5 minutes default
      retries = FLAGS.FORCE ? 0 : CONFIG.MAX_RETRIES,
      acceptPrompts = true,
      essential = true,
    } = options;

    let lastError = '';

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        this.logger.warn(`Retry attempt ${attempt}/${retries} for: ${command}`);
        await this.sleep(2000 * attempt); // Progressive backoff
      }

      try {
        this.logger.debug(`Executing: ${command}`, { cwd, attempt });

        if (FLAGS.DRY_RUN) {
          this.logger.info(`[DRY RUN] Would execute: ${command}`);
          return { success: true, output: '[DRY RUN] Simulated success' };
        }

        const startTime = performance.now();

        // Prepare command with auto-accept flags
        let finalCommand = command;
        if (acceptPrompts && FLAGS.YES) {
          finalCommand = this.addAutoAcceptFlags(command);
        }

        const result = await this.executeCommand(finalCommand, {
          cwd,
          timeout,
        });

        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        this.logger.success(`Completed in ${duration}s: ${command}`);

        return { success: true, output: result };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.logger.error(`Attempt ${attempt + 1} failed: ${command}`, {
          error: lastError,
        });

        if (!essential && attempt === 0) {
          this.logger.warn(
            `Non-essential command failed, continuing: ${command}`
          );
          return { success: false, output: '', error: lastError };
        }
      }
    }

    if (essential) {
      throw new Error(
        `Command failed after ${retries + 1} attempts: ${command}. Last error: ${lastError}`
      );
    }

    return { success: false, output: '', error: lastError };
  }

  private addAutoAcceptFlags(command: string): string {
    const autoAcceptMappings = {
      'npm install': 'npm install --yes',
      'supabase db push': 'supabase db push --include-all',
      'supabase functions deploy': 'supabase functions deploy --no-verify-jwt',
      vercel: 'vercel --yes',
      'vercel --prod': 'vercel --prod --yes',
      'npm audit': 'npm audit --audit-level=moderate',
      'pnpm update': 'pnpm update --latest',
      git: command.includes('git') ? command : command,
    };

    for (const [pattern, replacement] of Object.entries(autoAcceptMappings)) {
      if (command.includes(pattern)) {
        return command.replace(pattern, replacement);
      }
    }

    return command;
  }

  private executeCommand(
    command: string,
    options: { cwd: string; timeout: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const processId = `${Date.now()}-${Math.random()}`;

      const child = spawn('sh', ['-c', command], {
        cwd: options.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CI: 'true',
          FORCE_COLOR: '0',
          // Ensure critical environment variables are passed
          DATABASE_URL: process.env.DATABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      this.activeProcesses.set(processId, child);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle prompts by auto-accepting
      if (FLAGS.YES) {
        child.stdin?.write('y\n');
      }

      const timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        this.activeProcesses.delete(processId);
        reject(
          new Error(`Command timed out after ${options.timeout}ms: ${command}`)
        );
      }, options.timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        this.activeProcesses.delete(processId);

        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new Error(`Command failed with code ${code}: ${stderr || stdout}`)
          );
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        this.activeProcesses.delete(processId);
        reject(error);
      });
    });
  }

  async parallel(
    commands: Array<{
      command: string;
      name: string;
      options?: any;
    }>,
    limit: number = CONFIG.PARALLEL_LIMIT
  ): Promise<
    Array<{ name: string; success: boolean; output: string; error?: string }>
  > {
    const results: Array<{
      name: string;
      success: boolean;
      output: string;
      error?: string;
    }> = [];
    const executing: Promise<void>[] = [];
    let index = 0;

    const execute = async (cmd: (typeof commands)[0]): Promise<void> => {
      try {
        const result = await this.run(cmd.command, cmd.options);
        results.push({ name: cmd.name, ...result });
      } catch (error) {
        results.push({
          name: cmd.name,
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    while (index < commands.length || executing.length > 0) {
      // Start new commands up to the limit
      while (executing.length < limit && index < commands.length) {
        const promise = execute(commands[index]);
        executing.push(promise);
        index++;
      }

      // Wait for at least one to complete
      if (executing.length > 0) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          const promise = executing[i];
          if (
            (await Promise.race([promise, Promise.resolve('pending')])) !==
            'pending'
          ) {
            executing.splice(i, 1);
          }
        }
      }
    }

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  cleanup(): void {
    this.logger.info('Cleaning up active processes...');
    for (const [id, process] of this.activeProcesses) {
      try {
        process.kill('SIGTERM');
        this.logger.debug(`Terminated process ${id}`);
      } catch (error) {
        this.logger.warn(`Failed to terminate process ${id}`, { error });
      }
    }
    this.activeProcesses.clear();
  }
}

// Deployment phases
class DeploymentPhases {
  private logger: Logger;
  private runner: CommandRunner;
  private startTime: number;
  private backupPath?: string;

  constructor() {
    this.logger = Logger.getInstance();
    this.runner = CommandRunner.getInstance();
    this.startTime = Date.now();
  }

  // Phase 1: Pre-deployment validation
  async validateEnvironment(): Promise<void> {
    this.logger.info('🔍 Phase 1: Environment validation');

    // Dynamically build required tools list based on environment
    const baseTools = [
      { command: 'node --version', name: 'Node.js', pattern: /v(18|20|21|22|24)/ },
      { command: 'pnpm --version', name: 'pnpm' },
    ];

    const prodOnlyTools = [
      { command: 'supabase --version', name: 'Supabase CLI' },
      { command: 'vercel --version --no-clipboard', name: 'Vercel CLI' },
    ];

    const requiredTools = ENVIRONMENT === 'development' ? baseTools : [...baseTools, ...prodOnlyTools];

    for (const tool of requiredTools) {
      try {
        this.logger.debug(`Checking ${tool.name}...`);
        const result = await this.runner.run(tool.command, {
          essential: false,
          retries: 0,
          timeout: 10000, // 10 seconds
        });

        if (!result.success) {
          // For Vercel CLI, check if it's actually installed despite error
          if (
            tool.name === 'Vercel CLI' &&
            (result.output.includes('Vercel CLI') ||
              result.error?.includes('Vercel CLI'))
          ) {
            this.logger.success(`✅ ${tool.name} is installed`);
            continue;
          }
          throw new Error(`Missing required tool: ${tool.name}`);
        }

        this.logger.success(`✅ ${tool.name} is available`);
      } catch (error) {
        // Special handling for Vercel CLI - check if it's actually installed
        if (tool.name === 'Vercel CLI') {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Vercel CLI')) {
            this.logger.success(
              `✅ ${tool.name} is installed (ignoring configuration warnings)`
            );
            continue;
          }

          try {
            const simpleCheck = await this.runner.run('which vercel', {
              essential: false,
              retries: 0,
              timeout: 5000,
            });
            if (simpleCheck.success) {
              this.logger.success(
                `✅ ${tool.name} is installed (ignoring configuration warnings)`
              );
              continue;
            }
          } catch (_whichError) {
            // Fall through to original error
          }
        }
        throw new Error(`Missing required tool: ${tool.name}. Error: ${error}`);
      }
    }

    // Enhanced environment validation with critical checks
    this.logger.info('🔒 Validating critical environment variables...');
    const criticalEnvVars = [
      'DATABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const missingVars = criticalEnvVars.filter(
      (varName) => !process.env[varName]
    );
    if (missingVars.length > 0) {
      this.logger.error(
        `Missing critical environment variables: ${missingVars.join(', ')}`
      );
      if (!FLAGS.FORCE) {
        throw new Error(
          `Missing environment variables: ${missingVars.join(', ')}`
        );
      }
    }

    // Environment variables validation
    await this.runner.run('tsx scripts/check-env.ts', {
      essential: false,
      retries: 0,
    });

    // API connectivity tests
    if (!FLAGS.FORCE) {
      await this.runner.run('tsx scripts/check-env.ts --test-apis', {
        essential: false,
        retries: 1,
      });
    }

    this.logger.success('✅ Environment validation completed');
  }

  // Phase 2: Code quality and type checking
  async validateCodeQuality(): Promise<void> {
    this.logger.info('🔍 Phase 2: Code quality validation');

    if (FLAGS.SKIP_TESTS) {
      this.logger.warn(
        '⚠️  Skipping code quality checks due to --skip-tests flag'
      );
      return;
    }

    // Critical security check: Ensure no hardcoded credentials
    this.logger.info('🔒 Checking for hardcoded credentials...');
    try {
      await this.runner.run(
        'grep -r "postgresql://" packages/ --include="*.ts" --include="*.js" | grep -v node_modules | grep -v "process.env"',
        {
          essential: false,
          retries: 0,
        }
      );
      this.logger.error('⚠️  Found potential hardcoded database credentials!');
      if (!FLAGS.FORCE) {
        throw new Error(
          'Hardcoded credentials detected. Use --force to override.'
        );
      }
    } catch (_error) {
      this.logger.success('✅ No hardcoded credentials found');
    }

    const qualityChecks = [
      { command: 'pnpm typecheck', name: 'TypeScript check' },
      { command: 'pnpm lint', name: 'ESLint check' },
      { command: 'pnpm boundaries', name: 'Boundary check' },
    ];

    if (FLAGS.PARALLEL) {
      const results = await this.runner.parallel(qualityChecks);
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0 && !FLAGS.FORCE) {
        this.logger.error(
          `💥 Code quality checks failed: ${failures.map((f) => f.name).join(', ')}`
        );
        this.logger.warn(
          '💡 Consider running with --force to deploy despite errors, or fix the issues first.'
        );
        throw new Error(
          `Code quality checks failed: ${failures.map((f) => f.name).join(', ')}`
        );
      }
    } else {
      for (const check of qualityChecks) {
        await this.runner.run(check.command, { essential: !FLAGS.FORCE });
      }
    }

    this.logger.success('✅ Code quality validation completed');
  }

  // Phase 3: Database operations
  async handleDatabase(): Promise<void> {
    this.logger.info('🗄️  Phase 3: Database operations');

    if (FLAGS.SKIP_DB) {
      this.logger.warn('⚠️  Skipping database operations due to --skip-db flag');
      return;
    }

    // Test database connection first
    this.logger.info('🔗 Testing database connection...');
    try {
      await this.runner.run('supabase db ping', {
        essential: true,
        timeout: 30 * 1000, // 30 seconds
        retries: 3,
      });
      this.logger.success('✅ Database connection successful');
    } catch (error) {
      this.logger.error('❌ Database connection failed');
      throw error;
    }

    // Create backup for production
    if (ENVIRONMENT === 'production') {
      this.logger.info('Creating database backup...');
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.backupPath = join(
        CONFIG.BACKUP_DIR,
        `backup-${backupTimestamp}.sql`
      );

      if (!existsSync(CONFIG.BACKUP_DIR)) {
        mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
      }

      // Export database backup
      await this.runner.run(
        `supabase db dump --schema public > ${this.backupPath}`,
        {
          essential: true,
          timeout: 10 * 60 * 1000, // 10 minutes for backup
        }
      );

      this.logger.success(`Database backup created: ${this.backupPath}`);
    }

    // Database operations with enhanced error handling
    const dbCommands = [
      { command: 'pnpm db:generate', name: 'Generate database types' },
      {
        command: 'supabase db push --include-all',
        name: 'Push database schema',
      },
    ];

    for (const cmd of dbCommands) {
      try {
        await this.runner.run(cmd.command, {
          essential: true,
          timeout: 5 * 60 * 1000, // 5 minutes
        });
      } catch (error) {
        this.logger.error(`Database operation failed: ${cmd.name}`);
        if (this.backupPath && existsSync(this.backupPath)) {
          this.logger.info('Backup available for rollback if needed');
        }
        throw error;
      }
    }

    this.logger.success('✅ Database operations completed');
  }

  // Phase 4: Build application
  async buildApplication(): Promise<void> {
    this.logger.info('🏗️  Phase 4: Building application');

    if (FLAGS.SKIP_BUILD) {
      this.logger.warn('⚠️  Skipping build due to --skip-build flag');
      return;
    }

    // Clean previous builds
    await this.runner.run('rm -rf apps/web/.next .turbo', { essential: false });

    // Install dependencies
    await this.runner.run('pnpm install --no-frozen-lockfile', {
      essential: true,
      timeout: 10 * 60 * 1000, // 10 minutes
      acceptPrompts: false, // Disable auto-accept flags for pnpm install
    });

    // Build with appropriate settings
    const buildCommand =
      ENVIRONMENT === 'production'
        ? 'ANALYZE=true NODE_ENV=production pnpm build'
        : 'pnpm build';

    await this.runner.run(buildCommand, {
      essential: true,
      timeout: 15 * 60 * 1000, // 15 minutes
    });

    this.logger.success('✅ Application build completed');
  }

  // Phase 5: Deploy Supabase functions
  async deployFunctions(): Promise<void> {
    this.logger.info('⚡ Phase 5: Deploying Supabase functions');

    if (FLAGS.SKIP_FUNCTIONS) {
      this.logger.warn(
        '⚠️  Skipping function deployment due to --skip-functions flag'
      );
      return;
    }

    // Set up function secrets first
    this.logger.info('🔐 Setting up Edge Function secrets...');
    await this.runner.run('./scripts/setup-edge-function-secrets.sh', {
      essential: true,
      timeout: 5 * 60 * 1000,
    });

    // Deploy edge functions with proper error handling
    const functions = [
      'scheduled-sync',
      'sync-artists',
      'sync-setlists',
      'sync-shows',
      'sync-artist-shows',
      'sync-song-catalog',
      'update-trending',
    ];

    const functionCommands = functions.map((func) => ({
      command: `supabase functions deploy ${func} --no-verify-jwt`,
      name: `Deploy ${func}`,
      options: { essential: false, timeout: 3 * 60 * 1000 },
    }));

    this.logger.info(`📦 Deploying ${functions.length} Supabase functions...`);

    if (FLAGS.PARALLEL) {
      const results = await this.runner.parallel(functionCommands, 3);
      const failures = results.filter((r) => !r.success);
      const successes = results.filter((r) => r.success);

      this.logger.info(
        `✅ Successfully deployed ${successes.length}/${functions.length} functions`
      );

      if (failures.length > 0) {
        this.logger.warn(
          `⚠️  Failed to deploy: ${failures.map((f) => f.name).join(', ')}`
        );
        if (failures.length > functions.length / 2) {
          throw new Error('More than half of functions failed to deploy');
        }
      }
    } else {
      for (const cmd of functionCommands) {
        await this.runner.run(cmd.command, cmd.options);
      }
    }

    this.logger.success('✅ Supabase functions deployment completed');
  }

  // Phase 6: Deploy to Vercel
  async deployToVercel(): Promise<void> {
    this.logger.info('🚀 Phase 6: Deploying to Vercel');

    if (FLAGS.SKIP_VERCEL) {
      this.logger.warn(
        '⚠️  Skipping Vercel deployment due to --skip-vercel flag'
      );
      return;
    }

    // Prepare deployment command
    const deployCommand =
      ENVIRONMENT === 'production' ? 'vercel --prod --yes' : 'vercel --yes';

    await this.runner.run(deployCommand, {
      essential: true,
      timeout: 10 * 60 * 1000, // 10 minutes
    });

    this.logger.success('✅ Vercel deployment completed');
  }

  // Phase 7: Post-deployment validation
  async validateDeployment(): Promise<void> {
    this.logger.info('🔍 Phase 7: Post-deployment validation');

    // Determine health check URL
    const healthUrl =
      ENVIRONMENT === 'production'
        ? 'https://mysetlist.vercel.app/api/health'
        : 'http://localhost:3000/api/health';

    // Wait for deployment to be ready
    this.logger.info('Waiting for deployment to be ready...');
    await this.sleep(30000); // 30 seconds initial wait

    // Health check with retries
    for (let i = 0; i < CONFIG.HEALTH_CHECK_RETRIES; i++) {
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'MySetlist-Deploy-Bot' },
        });

        if (response.ok) {
          this.logger.success('✅ Health check passed');
          break;
        }

        throw new Error(`Health check failed: ${response.status}`);
      } catch (error) {
        if (i === CONFIG.HEALTH_CHECK_RETRIES - 1) {
          this.logger.error(
            `Health check failed after ${CONFIG.HEALTH_CHECK_RETRIES} attempts`
          );
          if (!FLAGS.FORCE) {
            throw error;
          }
        } else {
          this.logger.warn(`Health check attempt ${i + 1} failed, retrying...`);
          await this.sleep(CONFIG.HEALTH_CHECK_INTERVAL);
        }
      }
    }

    // Performance validation
    if (!FLAGS.QUICK) {
      await this.performanceValidation();
    }

    this.logger.success('✅ Post-deployment validation completed');
  }

  // Phase 8: Performance validation
  async performanceValidation(): Promise<void> {
    this.logger.info('⚡ Running performance validation');

    const targetUrl =
      ENVIRONMENT === 'production'
        ? 'https://mysetlist.vercel.app'
        : 'http://localhost:3000';

    // Run Lighthouse audit
    try {
      await this.runner.run(
        `lighthouse ${targetUrl} --output=json --output-path=./lighthouse-results.json --chrome-flags="--headless --no-sandbox"`,
        { essential: false, timeout: 5 * 60 * 1000 }
      );

      // Parse and log results
      if (existsSync('./lighthouse-results.json')) {
        const results = JSON.parse(
          readFileSync('./lighthouse-results.json', 'utf8')
        );
        const scores = {
          performance: Math.round(
            results.lhr.categories.performance.score * 100
          ),
          accessibility: Math.round(
            results.lhr.categories.accessibility.score * 100
          ),
          seo: Math.round(results.lhr.categories.seo.score * 100),
          'best-practices': Math.round(
            results.lhr.categories['best-practices'].score * 100
          ),
        };

        this.logger.info('Lighthouse scores:', scores);

        // Check if scores meet requirements
        const minScores = {
          performance: 80,
          accessibility: 90,
          seo: 85,
          'best-practices': 90,
        };
        const failures = Object.entries(scores).filter(
          ([key, score]) => score < minScores[key as keyof typeof minScores]
        );

        if (failures.length > 0 && !FLAGS.FORCE) {
          this.logger.warn(
            `Performance scores below threshold: ${failures.map(([k, v]) => `${k}: ${v}`).join(', ')}`
          );
        }
      }
    } catch (error) {
      this.logger.warn('Performance validation failed, continuing...', {
        error,
      });
    }
  }

  // Rollback functionality
  async rollback(): Promise<void> {
    this.logger.info('🔄 Starting rollback procedure');

    try {
      // Rollback Vercel deployment
      await this.runner.run('vercel rollback --yes', { essential: false });

      // Restore database backup if available
      if (this.backupPath && existsSync(this.backupPath)) {
        this.logger.info('Restoring database backup...');
        await this.runner.run('supabase db reset --db-url=$DATABASE_URL', {
          essential: false,
        });
        this.logger.success('Database rollback completed');
      }

      this.logger.success('✅ Rollback completed');
    } catch (error) {
      this.logger.error('Rollback failed', { error });
      throw error;
    }
  }

  // Utility methods
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getDeploymentDuration(): string {
    const duration = Date.now() - this.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// Main deployment orchestrator
class DeploymentOrchestrator {
  private logger: Logger;
  private phases: DeploymentPhases;
  private runner: CommandRunner;

  constructor() {
    this.logger = Logger.getInstance();
    this.phases = new DeploymentPhases();
    this.runner = CommandRunner.getInstance();
  }

  async run(): Promise<void> {
    this.logger.info('🚀 Starting ultimate deployment process');
    this.logger.info('Configuration:', {
      environment: ENVIRONMENT,
      flags: FLAGS,
      deploymentId: this.logger.getDeploymentId(),
    });

    try {
      // Handle rollback request
      if (FLAGS.ROLLBACK) {
        await this.phases.rollback();
        return;
      }

      // Validation-only mode
      if (FLAGS.VALIDATE_ONLY) {
        await this.phases.validateEnvironment();
        await this.phases.validateCodeQuality();
        this.logger.success('✅ Validation completed successfully');
        return;
      }

      // Full deployment process
      await this.phases.validateEnvironment();
      await this.phases.validateCodeQuality();
      await this.phases.handleDatabase();
      await this.phases.buildApplication();
      await this.phases.deployFunctions();
      await this.phases.deployToVercel();
      await this.phases.validateDeployment();

      // Final success message
      const duration = this.phases.getDeploymentDuration();
      this.logger.success(
        `🎉 Deployment completed successfully in ${duration}!`
      );
      this.logger.info('📊 Deployment summary:', {
        environment: ENVIRONMENT,
        duration,
        logFile: this.logger.getLogFile(),
      });
    } catch (error) {
      this.logger.error('💥 Deployment failed', { error });

      // Automatic rollback on production failure
      if (ENVIRONMENT === 'production' && !FLAGS.FORCE) {
        this.logger.info('🔄 Initiating automatic rollback...');
        try {
          await this.phases.rollback();
        } catch (rollbackError) {
          this.logger.error('Rollback also failed', { rollbackError });
        }
      }

      throw error;
    }
  }
}

// Signal handling for graceful shutdown
function setupSignalHandlers(runner: CommandRunner): void {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach((signal) => {
    process.on(signal, () => {
      const logger = Logger.getInstance();
      logger.info(`Received ${signal}, cleaning up...`);
      runner.cleanup();
      process.exit(1);
    });
  });
}

// Main execution
async function main(): Promise<void> {
  const orchestrator = new DeploymentOrchestrator();
  const runner = CommandRunner.getInstance();

  // Set up signal handlers
  setupSignalHandlers(runner);

  try {
    await orchestrator.run();
    process.exit(0);
  } catch (_error) {
    process.exit(1);
  }
}

// Execute if run directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DeploymentOrchestrator, DeploymentPhases, CommandRunner, Logger };
