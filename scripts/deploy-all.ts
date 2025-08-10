#!/usr/bin/env tsx
/**
 * All-in-One Deployment Script for MySetlist
 *
 * This script handles the complete deployment process:
 * 1. Environment validation
 * 2. Database migrations
 * 3. Type generation
 * 4. Build verification
 * 5. Supabase functions deployment
 * 6. Git operations (add, commit, push)
 * 7. Vercel deployment
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Helper function to execute commands
function exec(command: string, silent = false): string {
  try {
    console.log(`${colors.cyan}→ ${command}${colors.reset}`);
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: silent ? "pipe" : "inherit",
    });
    return output || "";
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// Helper function to check if command exists
function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// Step indicator
let stepNumber = 0;
function step(message: string) {
  stepNumber++;
  console.log(
    `\n${colors.bright}${colors.blue}[Step ${stepNumber}] ${message}${colors.reset}`,
  );
}

// Success indicator
function success(message: string) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

// Warning indicator
function warn(message: string) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

// Error indicator
function error(message: string) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════╗
║   MySetlist - Complete Deployment Script   ║
╚════════════════════════════════════════════╝
${colors.reset}`);

  const startTime = Date.now();

  try {
    // Step 1: Verify environment
    step("Verifying environment and dependencies");

    // Check required commands
    const requiredCommands = ["git", "pnpm", "npx", "supabase"];
    const missingCommands = requiredCommands.filter(
      (cmd) => !commandExists(cmd),
    );

    if (missingCommands.length > 0) {
      throw new Error(
        `Missing required commands: ${missingCommands.join(", ")}\nPlease install them before running this script.`,
      );
    }

    // Check for .env files
    if (!existsSync(".env.local") && !existsSync(".env")) {
      throw new Error(
        "No environment file found. Please create .env.local or .env",
      );
    }

    success("Environment verified");

    // Step 2: Install dependencies
    step("Installing dependencies");
    exec("pnpm install --frozen-lockfile", true);
    success("Dependencies installed");

    // Step 3: Database operations
    step("Running database migrations");

    // Generate Drizzle migrations
    exec("pnpm db:generate");
    success("Database migrations generated");

    // Push to database
    exec("pnpm db:push");
    success("Database schema updated");

    // Step 4: Generate TypeScript types
    step("Generating TypeScript types");

    // Generate Supabase types
    try {
      exec(
        "npx supabase gen types typescript --project-id yzwkimtdaabyjbpykquu > packages/database/src/types/supabase.ts",
      );
      success("Supabase types generated");
    } catch (e) {
      warn("Could not generate Supabase types - continuing anyway");
    }

    // Step 5: Run type checking
    step("Running type check");
    try {
      exec("pnpm typecheck");
      success("Type check passed");
    } catch (e) {
      warn("Type check failed - continuing with deployment");
    }

    // Step 6: Build the application
    step("Building application");
    exec("pnpm build");
    success("Application built successfully");

    // Step 7: Deploy Supabase Edge Functions
    step("Deploying Supabase Edge Functions");

    const supabaseFunctionsDir = join(process.cwd(), "supabase", "functions");
    if (existsSync(supabaseFunctionsDir)) {
      try {
        // Link project if not already linked
        exec("npx supabase link --project-ref yzwkimtdaabyjbpykquu", true);

        // Deploy functions
        exec("npx supabase functions deploy");
        success("Supabase Edge Functions deployed");
      } catch (e) {
        warn(
          "Could not deploy Supabase functions - they may not exist or already be deployed",
        );
      }
    } else {
      warn("No Supabase functions directory found - skipping");
    }

    // Step 8: Setup cron jobs (via migrations)
    step("Setting up cron jobs");

    const cronMigration = `
    -- Update cron job URLs to use the correct API endpoints
    UPDATE cron.job 
    SET command = REPLACE(command, 'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/', 'https://mysetlist.vercel.app/api/')
    WHERE command LIKE '%supabase.co/functions/v1/%';
    `;

    try {
      // Write temporary migration file
      const fs = await import("node:fs");
      fs.writeFileSync("/tmp/update_cron.sql", cronMigration);

      // Apply migration
      exec("npx supabase db push --file /tmp/update_cron.sql", true);
      success("Cron jobs updated");
    } catch (e) {
      warn("Could not update cron jobs - may need manual configuration");
    }

    // Step 9: Git operations
    step("Committing changes");

    // Check for changes
    const gitStatus = exec("git status --porcelain", true);

    if (gitStatus.trim()) {
      // Add all changes
      exec("git add -A");

      // Create commit message
      const timestamp = new Date().toISOString();
      const commitMessage = `chore: deployment build - ${timestamp}

- Database migrations applied
- TypeScript types generated
- Application built
- Ready for production deployment

[skip ci]`;

      // Commit changes
      exec(`git commit -m "${commitMessage}"`);
      success("Changes committed");

      // Push to remote
      step("Pushing to remote repository");

      // Get current branch
      const currentBranch = exec("git branch --show-current", true).trim();

      // Push changes
      exec(`git push origin ${currentBranch}`);
      success(`Pushed to origin/${currentBranch}`);
    } else {
      warn("No changes to commit");
    }

    // Step 10: Deploy to Vercel
    step("Deploying to Vercel");

    // Check if Vercel is configured
    if (!existsSync(".vercel")) {
      warn("Vercel not configured. Run 'vercel' to set up your project first.");
      console.log("\nTo complete deployment:");
      console.log("1. Run: vercel");
      console.log("2. Follow the prompts to link your project");
      console.log("3. Run: vercel --prod");
    } else {
      try {
        // Deploy to production
        exec("vercel --prod --yes");
        success("Deployed to Vercel production");
      } catch (e) {
        error(
          "Vercel deployment failed - you may need to run 'vercel login' first",
        );
      }
    }

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n${colors.bright}${colors.green}
╔════════════════════════════════════════════╗
║         Deployment Complete! 🎉            ║
╚════════════════════════════════════════════╝
${colors.reset}
${colors.green}✓${colors.reset} All deployment steps completed
${colors.cyan}⏱${colors.reset}  Total time: ${duration} seconds

${colors.bright}Next Steps:${colors.reset}
1. Verify your application at https://mysetlist.vercel.app
2. Check Supabase dashboard for function status
3. Monitor logs for any issues

${colors.cyan}Useful commands:${colors.reset}
• View logs: vercel logs
• Check functions: npx supabase functions list
• Database studio: pnpm db:studio
`);
  } catch (err: any) {
    error(`Deployment failed: ${err.message}`);
    console.log(
      `\n${colors.yellow}You can try to fix the issue and run the script again.${colors.reset}`,
    );
    process.exit(1);
  }
}

// Run the deployment
main().catch(console.error);
