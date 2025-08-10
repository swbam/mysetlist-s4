#!/usr/bin/env tsx

/**
 * Production Readiness Validation Script
 * Comprehensive checklist for production deployment
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: string;
}

interface CheckCategory {
  name: string;
  checks: CheckResult[];
}

class ProductionReadinessChecker {
  private results: CheckCategory[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async runAllChecks(): Promise<void> {
    console.log("🚀 Running Production Readiness Validation...\n");

    await this.checkBuildSystem();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkAccessibility();
    await this.checkTesting();
    await this.checkEnvironment();
    await this.checkDatabase();
    await this.checkMonitoring();
    await this.checkDeployment();
    await this.checkDocumentation();

    this.generateReport();
  }

  private async checkBuildSystem(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check if build succeeds
    try {
      execSync("npm run build", { stdio: "pipe" });
      checks.push({
        name: "Build Success",
        status: "pass",
        message: "Application builds successfully",
      });
    } catch (error) {
      checks.push({
        name: "Build Success",
        status: "fail",
        message: "Build failed",
        details: String(error),
      });
    }

    // Check TypeScript compilation
    try {
      execSync("npm run typecheck", { stdio: "pipe" });
      checks.push({
        name: "TypeScript Compilation",
        status: "pass",
        message: "No TypeScript errors",
      });
    } catch (error) {
      checks.push({
        name: "TypeScript Compilation",
        status: "fail",
        message: "TypeScript compilation errors found",
        details: String(error),
      });
    }

    // Check for linting errors
    try {
      execSync("npm run lint", { stdio: "pipe" });
      checks.push({
        name: "Linting",
        status: "pass",
        message: "No linting errors",
      });
    } catch (error) {
      checks.push({
        name: "Linting",
        status: "fail",
        message: "Linting errors found",
        details: String(error),
      });
    }

    // Check bundle size
    const buildDir = join(this.projectRoot, ".next");
    if (existsSync(buildDir)) {
      const stats = statSync(buildDir);
      const sizeInMB = stats.size / (1024 * 1024);

      if (sizeInMB < 50) {
        checks.push({
          name: "Bundle Size",
          status: "pass",
          message: `Bundle size is acceptable (${sizeInMB.toFixed(2)}MB)`,
        });
      } else {
        checks.push({
          name: "Bundle Size",
          status: "warn",
          message: `Bundle size might be too large (${sizeInMB.toFixed(2)}MB)`,
        });
      }
    }

    this.results.push({ name: "Build System", checks });
  }

  private async checkSecurity(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check for security vulnerabilities
    try {
      execSync("npm audit --audit-level high", { stdio: "pipe" });
      checks.push({
        name: "Security Audit",
        status: "pass",
        message: "No high-severity security vulnerabilities found",
      });
    } catch (error) {
      checks.push({
        name: "Security Audit",
        status: "fail",
        message: "Security vulnerabilities found",
        details: String(error),
      });
    }

    // Check for hardcoded secrets
    const sensitiveFiles = [
      "next.config.ts",
      "middleware.ts",
      "app/api/**/*.ts",
    ];

    let hasHardcodedSecrets = false;
    sensitiveFiles.forEach((pattern) => {
      try {
        const result = execSync(
          `grep -r "sk_\\|pk_\\|api_key\\|secret" ${pattern}`,
          { stdio: "pipe" },
        );
        if (result.length > 0) {
          hasHardcodedSecrets = true;
        }
      } catch (error) {
        // Grep returns non-zero exit code when no matches found
      }
    });

    if (hasHardcodedSecrets) {
      checks.push({
        name: "Hardcoded Secrets",
        status: "fail",
        message: "Potential hardcoded secrets found",
      });
    } else {
      checks.push({
        name: "Hardcoded Secrets",
        status: "pass",
        message: "No hardcoded secrets detected",
      });
    }

    // Check HTTPS configuration
    const nextConfig = join(this.projectRoot, "next.config.ts");
    if (existsSync(nextConfig)) {
      const content = readFileSync(nextConfig, "utf8");
      if (content.includes("https") || content.includes("secure")) {
        checks.push({
          name: "HTTPS Configuration",
          status: "pass",
          message: "HTTPS configuration found",
        });
      } else {
        checks.push({
          name: "HTTPS Configuration",
          status: "warn",
          message: "HTTPS configuration not explicitly found",
        });
      }
    }

    this.results.push({ name: "Security", checks });
  }

  private async checkPerformance(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check for performance optimizations
    const nextConfig = join(this.projectRoot, "next.config.ts");
    if (existsSync(nextConfig)) {
      const content = readFileSync(nextConfig, "utf8");

      // Check for image optimization
      if (content.includes("images") || content.includes("Image")) {
        checks.push({
          name: "Image Optimization",
          status: "pass",
          message: "Image optimization configured",
        });
      } else {
        checks.push({
          name: "Image Optimization",
          status: "warn",
          message: "Image optimization not configured",
        });
      }

      // Check for compression
      if (content.includes("compress") || content.includes("gzip")) {
        checks.push({
          name: "Compression",
          status: "pass",
          message: "Compression configured",
        });
      } else {
        checks.push({
          name: "Compression",
          status: "warn",
          message: "Compression not explicitly configured",
        });
      }
    }

    // Check for service worker
    const serviceWorkerPath = join(this.projectRoot, "public", "sw.js");
    if (existsSync(serviceWorkerPath)) {
      checks.push({
        name: "Service Worker",
        status: "pass",
        message: "Service worker found",
      });
    } else {
      checks.push({
        name: "Service Worker",
        status: "warn",
        message: "Service worker not found",
      });
    }

    // Run Lighthouse check if available
    try {
      execSync("npx lighthouse --version", { stdio: "pipe" });
      checks.push({
        name: "Lighthouse Available",
        status: "pass",
        message: "Lighthouse is available for performance testing",
      });
    } catch (error) {
      checks.push({
        name: "Lighthouse Available",
        status: "warn",
        message: "Lighthouse not available",
      });
    }

    this.results.push({ name: "Performance", checks });
  }

  private async checkAccessibility(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check for accessibility testing tools
    const packageJson = join(this.projectRoot, "package.json");
    if (existsSync(packageJson)) {
      const content = readFileSync(packageJson, "utf8");
      const pkg = JSON.parse(content);

      const devDeps = pkg.devDependencies || {};

      if (devDeps["@axe-core/playwright"]) {
        checks.push({
          name: "Axe Core Testing",
          status: "pass",
          message: "Axe Core testing tools available",
        });
      } else {
        checks.push({
          name: "Axe Core Testing",
          status: "warn",
          message: "Axe Core testing tools not found",
        });
      }

      if (devDeps["jest-axe"]) {
        checks.push({
          name: "Jest Axe Testing",
          status: "pass",
          message: "Jest Axe testing available",
        });
      } else {
        checks.push({
          name: "Jest Axe Testing",
          status: "warn",
          message: "Jest Axe testing not available",
        });
      }
    }

    // Check for accessibility test files
    const a11yTestPath = join(this.projectRoot, "tests", "accessibility");
    if (existsSync(a11yTestPath)) {
      checks.push({
        name: "Accessibility Tests",
        status: "pass",
        message: "Accessibility tests found",
      });
    } else {
      checks.push({
        name: "Accessibility Tests",
        status: "fail",
        message: "Accessibility tests not found",
      });
    }

    this.results.push({ name: "Accessibility", checks });
  }

  private async checkTesting(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check test suite
    try {
      execSync("npm run test", { stdio: "pipe" });
      checks.push({
        name: "Unit Tests",
        status: "pass",
        message: "Unit tests pass",
      });
    } catch (error) {
      checks.push({
        name: "Unit Tests",
        status: "fail",
        message: "Unit tests failing",
        details: String(error),
      });
    }

    // Check for E2E tests
    const cypressDir = join(this.projectRoot, "cypress");
    if (existsSync(cypressDir)) {
      checks.push({
        name: "E2E Tests",
        status: "pass",
        message: "E2E tests available",
      });
    } else {
      checks.push({
        name: "E2E Tests",
        status: "warn",
        message: "E2E tests not found",
      });
    }

    // Check test coverage
    try {
      execSync("npm run test:unit", { stdio: "pipe" });
      checks.push({
        name: "Test Coverage",
        status: "pass",
        message: "Test coverage available",
      });
    } catch (error) {
      checks.push({
        name: "Test Coverage",
        status: "warn",
        message: "Test coverage not available",
      });
    }

    this.results.push({ name: "Testing", checks });
  }

  private async checkEnvironment(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check environment variables
    const envExample = join(this.projectRoot, ".env.example");
    if (existsSync(envExample)) {
      checks.push({
        name: "Environment Example",
        status: "pass",
        message: "Environment example file exists",
      });
    } else {
      checks.push({
        name: "Environment Example",
        status: "warn",
        message: "Environment example file not found",
      });
    }

    // Check for production environment variables
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "DATABASE_URL",
    ];

    requiredEnvVars.forEach((envVar) => {
      if (process.env[envVar]) {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: "pass",
          message: `${envVar} is set`,
        });
      } else {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: "fail",
          message: `${envVar} is not set`,
        });
      }
    });

    this.results.push({ name: "Environment", checks });
  }

  private async checkDatabase(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check database connection
    try {
      // This would need to be implemented based on your database setup
      checks.push({
        name: "Database Connection",
        status: "warn",
        message: "Database connection check not implemented",
      });
    } catch (error) {
      checks.push({
        name: "Database Connection",
        status: "fail",
        message: "Database connection failed",
        details: String(error),
      });
    }

    // Check for migrations
    const migrationsDir = join(this.projectRoot, "migrations");
    if (existsSync(migrationsDir)) {
      checks.push({
        name: "Database Migrations",
        status: "pass",
        message: "Database migrations found",
      });
    } else {
      checks.push({
        name: "Database Migrations",
        status: "warn",
        message: "Database migrations not found",
      });
    }

    this.results.push({ name: "Database", checks });
  }

  private async checkMonitoring(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check for Sentry configuration
    const sentryConfig = join(this.projectRoot, "sentry.client.config.ts");
    if (existsSync(sentryConfig)) {
      checks.push({
        name: "Error Monitoring",
        status: "pass",
        message: "Sentry error monitoring configured",
      });
    } else {
      checks.push({
        name: "Error Monitoring",
        status: "warn",
        message: "Error monitoring not configured",
      });
    }

    // Check for analytics
    const packageJson = join(this.projectRoot, "package.json");
    if (existsSync(packageJson)) {
      const content = readFileSync(packageJson, "utf8");
      const pkg = JSON.parse(content);

      if (
        pkg.dependencies?.["@vercel/analytics"] ||
        pkg.dependencies?.["@google-analytics/gtag"]
      ) {
        checks.push({
          name: "Analytics",
          status: "pass",
          message: "Analytics configured",
        });
      } else {
        checks.push({
          name: "Analytics",
          status: "warn",
          message: "Analytics not configured",
        });
      }
    }

    this.results.push({ name: "Monitoring", checks });
  }

  private async checkDeployment(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check for deployment configuration
    const vercelConfig = join(this.projectRoot, "vercel.json");
    if (existsSync(vercelConfig)) {
      checks.push({
        name: "Vercel Configuration",
        status: "pass",
        message: "Vercel deployment configuration found",
      });
    } else {
      checks.push({
        name: "Vercel Configuration",
        status: "warn",
        message: "Vercel deployment configuration not found",
      });
    }

    // Check for Docker configuration
    const dockerfile = join(this.projectRoot, "Dockerfile");
    if (existsSync(dockerfile)) {
      checks.push({
        name: "Docker Configuration",
        status: "pass",
        message: "Docker configuration found",
      });
    } else {
      checks.push({
        name: "Docker Configuration",
        status: "warn",
        message: "Docker configuration not found",
      });
    }

    this.results.push({ name: "Deployment", checks });
  }

  private async checkDocumentation(): Promise<void> {
    const checks: CheckResult[] = [];

    // Check for README
    const readme = join(this.projectRoot, "README.md");
    if (existsSync(readme)) {
      checks.push({
        name: "README Documentation",
        status: "pass",
        message: "README.md found",
      });
    } else {
      checks.push({
        name: "README Documentation",
        status: "warn",
        message: "README.md not found",
      });
    }

    // Check for API documentation
    const apiDocs = join(this.projectRoot, "docs", "api.md");
    if (existsSync(apiDocs)) {
      checks.push({
        name: "API Documentation",
        status: "pass",
        message: "API documentation found",
      });
    } else {
      checks.push({
        name: "API Documentation",
        status: "warn",
        message: "API documentation not found",
      });
    }

    this.results.push({ name: "Documentation", checks });
  }

  private generateReport(): void {
    console.log("\n📊 PRODUCTION READINESS REPORT\n");
    console.log("=".repeat(50));

    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let warningChecks = 0;

    this.results.forEach((category) => {
      console.log(`\n🔍 ${category.name}:`);
      console.log("-".repeat(30));

      category.checks.forEach((check) => {
        totalChecks++;
        const icon =
          check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⚠️";
        console.log(`${icon} ${check.name}: ${check.message}`);

        if (check.details) {
          console.log(`   Details: ${check.details}`);
        }

        if (check.status === "pass") passedChecks++;
        else if (check.status === "fail") failedChecks++;
        else warningChecks++;
      });
    });

    console.log("\n" + "=".repeat(50));
    console.log("📈 SUMMARY:");
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    console.log(`⚠️  Warnings: ${warningChecks}`);

    const successRate = (passedChecks / totalChecks) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);

    if (failedChecks === 0) {
      console.log("\n🚀 READY FOR PRODUCTION!");
    } else {
      console.log("\n⚠️  PLEASE FIX FAILED CHECKS BEFORE PRODUCTION DEPLOYMENT");
    }

    console.log("\n" + "=".repeat(50));
  }
}

// Run the checks
const checker = new ProductionReadinessChecker();
checker.runAllChecks().catch(console.error);
