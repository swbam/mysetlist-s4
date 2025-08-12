#!/usr/bin/env tsx
/**
 * Simple deployment script for TheSet
 *
 * Usage: pnpm deploy
 */

import { execSync } from "node:child_process";
import chalk from "chalk";

async function deploy() {
  console.log(chalk.blue("🚀 Starting TheSet deployment...\n"));

  try {
    // 1. Check environment
    console.log(chalk.yellow("📋 Checking environment variables..."));
    execSync("pnpm check:env", { stdio: "inherit" });

    // 2. Run build
    console.log(chalk.yellow("\n🔨 Building application..."));
    execSync("pnpm build", { stdio: "inherit" });

    // 3. Deploy to Vercel
    console.log(chalk.yellow("\n🚢 Deploying to Vercel..."));
    execSync("vercel --prod", { stdio: "inherit" });

    console.log(chalk.green("\n✅ Deployment successful!"));
    console.log(chalk.blue("🌐 Your app is now live at: https://theset.live"));
  } catch (error) {
    console.error(chalk.red("❌ Deployment failed:"), error);
    process.exit(1);
  }
}

// Run deployment
deploy();
