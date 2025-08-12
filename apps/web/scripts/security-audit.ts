#!/usr/bin/env tsx

/**
 * Comprehensive Security Audit Script for TheSet App
 * Automated vulnerability scanning and security testing
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface SecurityFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  file?: string;
  line?: number;
}

interface SecurityReport {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findings: SecurityFinding[];
  recommendations: string[];
}

class SecurityAuditor {
  private projectRoot: string;
  private findings: SecurityFinding[] = [];

  constructor() {
    this.projectRoot = process.cwd();
  }

  async runSecurityAudit(): Promise<void> {
    console.log("🔒 Starting Comprehensive Security Audit...\n");

    await this.checkDependencyVulnerabilities();
    await this.checkHardcodedSecrets();
    await this.checkAuthenticationSecurity();
    await this.checkAPISecurityHeaders();
    await this.checkInputValidation();
    await this.checkFilePermissions();
    await this.checkEnvironmentSecurity();
    await this.checkDatabaseSecurity();
    await this.checkCSRFProtection();
    await this.checkContentSecurityPolicy();
    await this.checkRateLimiting();
    await this.checkSessionSecurity();
    await this.checkDataEncryption();
    await this.checkLoggingSecurity();
    await this.checkThirdPartyIntegrations();

    this.generateSecurityReport();
  }

  private async checkDependencyVulnerabilities(): Promise<void> {
    console.log("🔍 Checking dependency vulnerabilities...");

    try {
      // Run npm audit
      const auditResult = execSync("npm audit --json", {
        stdio: "pipe",
        encoding: "utf8",
      });

      const auditData = JSON.parse(auditResult);

      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(
          ([pkg, vuln]: [string, any]) => {
            if (vuln.severity === "critical" || vuln.severity === "high") {
              this.findings.push({
                severity: vuln.severity,
                category: "Dependencies",
                title: `Vulnerable dependency: ${pkg}`,
                description: `${vuln.title || "Security vulnerability detected"}`,
                recommendation: `Update ${pkg} to version ${vuln.fixAvailable?.version || "latest"}`,
              });
            }
          },
        );
      }
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      const output = String(error);
      if (output.includes("vulnerabilities")) {
        this.findings.push({
          severity: "high",
          category: "Dependencies",
          title: "Dependency vulnerabilities detected",
          description: "npm audit found security vulnerabilities",
          recommendation: "Run npm audit fix to resolve vulnerabilities",
        });
      }
    }

    // Check for outdated dependencies
    try {
      const outdatedResult = execSync("npm outdated --json", {
        stdio: "pipe",
        encoding: "utf8",
      });

      const outdatedData = JSON.parse(outdatedResult);
      const criticalPackages = [
        "next",
        "react",
        "react-dom",
        "@supabase/supabase-js",
      ];

      Object.entries(outdatedData).forEach(([pkg, info]: [string, any]) => {
        if (criticalPackages.includes(pkg)) {
          this.findings.push({
            severity: "medium",
            category: "Dependencies",
            title: `Outdated critical dependency: ${pkg}`,
            description: `${pkg} is outdated (current: ${info.current}, latest: ${info.latest})`,
            recommendation: `Update ${pkg} to latest version`,
          });
        }
      });
    } catch (error) {
      // npm outdated returns non-zero exit code when outdated packages found
    }
  }

  private async checkHardcodedSecrets(): Promise<void> {
    console.log("🔍 Checking for hardcoded secrets...");

    const secretPatterns = [
      { pattern: /sk_[a-zA-Z0-9]{20,}/, type: "Stripe Secret Key" },
      { pattern: /pk_[a-zA-Z0-9]{20,}/, type: "Stripe Public Key" },
      { pattern: /AIza[0-9A-Za-z-_]{35}/, type: "Google API Key" },
      { pattern: /AKIA[0-9A-Z]{16}/, type: "AWS Access Key ID" },
      { pattern: /[0-9a-zA-Z/+]{40}/, type: "AWS Secret Access Key" },
      { pattern: /ghp_[0-9a-zA-Z]{36}/, type: "GitHub Personal Access Token" },
      { pattern: /gho_[0-9a-zA-Z]{36}/, type: "GitHub OAuth Token" },
      { pattern: /ghu_[0-9a-zA-Z]{36}/, type: "GitHub User-to-Server Token" },
      { pattern: /ghs_[0-9a-zA-Z]{36}/, type: "GitHub Server-to-Server Token" },
      { pattern: /ghr_[0-9a-zA-Z]{36}/, type: "GitHub Refresh Token" },
      {
        pattern: /xoxb-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}/,
        type: "Slack Bot Token",
      },
      {
        pattern: /xoxp-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}/,
        type: "Slack User Token",
      },
      {
        pattern: /password\\s*=\\s*[\"'][^\"'\\s]+[\"']/,
        type: "Hardcoded Password",
      },
      {
        pattern: /secret\\s*=\\s*[\"'][^\"'\\s]+[\"']/,
        type: "Hardcoded Secret",
      },
      {
        pattern: /api_key\\s*=\\s*[\"'][^\"'\\s]+[\"']/,
        type: "Hardcoded API Key",
      },
    ];

    const filesToCheck = [
      "next.config.ts",
      "middleware.ts",
      "app/**/*.ts",
      "app/**/*.tsx",
      "lib/**/*.ts",
      "components/**/*.ts",
      "components/**/*.tsx",
    ];

    filesToCheck.forEach((pattern) => {
      try {
        const files = execSync(`find . -name "${pattern}" -type f`, {
          stdio: "pipe",
          encoding: "utf8",
        })
          .split("\n")
          .filter(Boolean);

        files.forEach((file) => {
          if (existsSync(file)) {
            const content = readFileSync(file, "utf8");

            secretPatterns.forEach(({ pattern, type }) => {
              const matches = content.match(pattern);
              if (matches) {
                this.findings.push({
                  severity: "critical",
                  category: "Secrets",
                  title: `Potential hardcoded secret: ${type}`,
                  description: `Found pattern matching ${type} in ${file}`,
                  recommendation: "Move secrets to environment variables",
                  file,
                });
              }
            });
          }
        });
      } catch (error) {
        // Pattern might not match any files
      }
    });
  }

  private async checkAuthenticationSecurity(): Promise<void> {
    console.log("🔍 Checking authentication security...");

    // Check for proper session handling
    const authFiles = [
      "middleware.ts",
      "app/auth/**/*.ts",
      "app/auth/**/*.tsx",
      "lib/auth.ts",
    ];

    authFiles.forEach((pattern) => {
      try {
        const files = execSync(`find . -name "${pattern}" -type f`, {
          stdio: "pipe",
          encoding: "utf8",
        })
          .split("\n")
          .filter(Boolean);

        files.forEach((file) => {
          if (existsSync(file)) {
            const content = readFileSync(file, "utf8");

            // Check for secure session configuration
            if (content.includes("session") && !content.includes("secure")) {
              this.findings.push({
                severity: "medium",
                category: "Authentication",
                title: "Potentially insecure session configuration",
                description: `Session handling in ${file} may not be secure`,
                recommendation:
                  "Ensure session cookies are secure and httpOnly",
                file,
              });
            }

            // Check for JWT token handling
            if (content.includes("jwt") || content.includes("token")) {
              if (
                !content.includes("verify") &&
                !content.includes("validate")
              ) {
                this.findings.push({
                  severity: "high",
                  category: "Authentication",
                  title: "JWT token validation missing",
                  description: `JWT token handling in ${file} may lack proper validation`,
                  recommendation: "Implement proper JWT token validation",
                  file,
                });
              }
            }

            // Check for password handling
            if (
              content.includes("password") &&
              !content.includes("bcrypt") &&
              !content.includes("hash")
            ) {
              this.findings.push({
                severity: "critical",
                category: "Authentication",
                title: "Plaintext password handling",
                description: `Password handling in ${file} appears to be in plaintext`,
                recommendation: "Use proper password hashing (bcrypt, argon2)",
                file,
              });
            }
          }
        });
      } catch (error) {
        // Pattern might not match any files
      }
    });
  }

  private async checkAPISecurityHeaders(): Promise<void> {
    console.log("🔍 Checking API security headers...");

    const middlewareFile = join(this.projectRoot, "middleware.ts");
    if (existsSync(middlewareFile)) {
      const content = readFileSync(middlewareFile, "utf8");

      const securityHeaders = [
        "X-Frame-Options",
        "X-Content-Type-Options",
        "X-XSS-Protection",
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "Referrer-Policy",
      ];

      securityHeaders.forEach((header) => {
        if (!content.includes(header)) {
          this.findings.push({
            severity: "medium",
            category: "Security Headers",
            title: `Missing security header: ${header}`,
            description: `Security header ${header} is not configured`,
            recommendation: `Add ${header} to middleware.ts`,
            file: middlewareFile,
          });
        }
      });
    } else {
      this.findings.push({
        severity: "high",
        category: "Security Headers",
        title: "No middleware.ts found",
        description: "No middleware configuration found for security headers",
        recommendation: "Create middleware.ts with security headers",
      });
    }
  }

  private async checkInputValidation(): Promise<void> {
    console.log("🔍 Checking input validation...");

    const apiFiles = execSync('find app/api -name "*.ts" -type f', {
      stdio: "pipe",
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);

    apiFiles.forEach((file) => {
      if (existsSync(file)) {
        const content = readFileSync(file, "utf8");

        // Check for input validation
        if (
          content.includes("request.json()") ||
          content.includes("request.formData()")
        ) {
          if (
            !content.includes("zod") &&
            !content.includes("joi") &&
            !content.includes("validate")
          ) {
            this.findings.push({
              severity: "high",
              category: "Input Validation",
              title: "Missing input validation",
              description: `API endpoint ${file} processes input without validation`,
              recommendation:
                "Add input validation using zod or similar library",
              file,
            });
          }
        }

        // Check for SQL injection protection
        if (
          content.includes("SELECT") ||
          content.includes("INSERT") ||
          content.includes("UPDATE")
        ) {
          if (
            !content.includes("prepared") &&
            !content.includes("parameterized")
          ) {
            this.findings.push({
              severity: "critical",
              category: "SQL Injection",
              title: "Potential SQL injection vulnerability",
              description: `SQL queries in ${file} may be vulnerable to injection`,
              recommendation: "Use parameterized queries or ORM",
              file,
            });
          }
        }
      }
    });
  }

  private async checkFilePermissions(): Promise<void> {
    console.log("🔍 Checking file permissions...");

    const sensitiveFiles = [
      ".env",
      ".env.local",
      ".env.production",
      "private.key",
      "server.key",
    ];

    sensitiveFiles.forEach((file) => {
      if (existsSync(file)) {
        try {
          const stats = execSync(`stat -c "%a" ${file}`, {
            stdio: "pipe",
            encoding: "utf8",
          }).trim();

          if (stats !== "600" && stats !== "400") {
            this.findings.push({
              severity: "medium",
              category: "File Permissions",
              title: `Insecure file permissions: ${file}`,
              description: `File ${file} has permissions ${stats}`,
              recommendation: "Set file permissions to 600 or 400",
              file,
            });
          }
        } catch (error) {
          // File might not exist or stat command failed
        }
      }
    });
  }

  private async checkEnvironmentSecurity(): Promise<void> {
    console.log("🔍 Checking environment security...");

    const envFiles = [".env", ".env.local", ".env.production"];

    envFiles.forEach((envFile) => {
      if (existsSync(envFile)) {
        const content = readFileSync(envFile, "utf8");

        // Check for development keys in production
        if (envFile.includes("production") && content.includes("localhost")) {
          this.findings.push({
            severity: "high",
            category: "Environment",
            title: "Development configuration in production",
            description: `Production environment file ${envFile} contains development settings`,
            recommendation: "Remove development configurations from production",
            file: envFile,
          });
        }

        // Check for weak database passwords
        const dbPasswordMatch = content.match(/DB_PASSWORD=(.+)/);
        if (dbPasswordMatch) {
          const password = dbPasswordMatch[1];
          if (
            password &&
            (password.length < 12 ||
              !/[A-Z]/.test(password) ||
              !/[0-9]/.test(password))
          ) {
            this.findings.push({
              severity: "medium",
              category: "Environment",
              title: "Weak database password",
              description:
                "Database password does not meet security requirements",
              recommendation:
                "Use strong password with mixed case, numbers, and symbols",
              file: envFile,
            });
          }
        }
      }
    });
  }

  private async checkDatabaseSecurity(): Promise<void> {
    console.log("🔍 Checking database security...");

    // Check for database connection security
    const dbFiles = execSync(
      'find . -name "*.ts" -exec grep -l "createClient\\|database" {} \\;',
      {
        stdio: "pipe",
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter(Boolean);

    dbFiles.forEach((file) => {
      if (existsSync(file)) {
        const content = readFileSync(file, "utf8");

        // Check for SSL/TLS connection
        if (
          content.includes("database") &&
          !content.includes("ssl") &&
          !content.includes("tls")
        ) {
          this.findings.push({
            severity: "medium",
            category: "Database",
            title: "Database connection may not use SSL/TLS",
            description: `Database connection in ${file} may not be encrypted`,
            recommendation: "Enable SSL/TLS for database connections",
            file,
          });
        }

        // Check for connection pooling
        if (content.includes("createClient") && !content.includes("pool")) {
          this.findings.push({
            severity: "low",
            category: "Database",
            title: "Database connection pooling not configured",
            description: `Database connection in ${file} may not use connection pooling`,
            recommendation:
              "Configure connection pooling for better performance and security",
            file,
          });
        }
      }
    });
  }

  private async checkCSRFProtection(): Promise<void> {
    console.log("🔍 Checking CSRF protection...");

    const middlewareFile = join(this.projectRoot, "middleware.ts");
    if (existsSync(middlewareFile)) {
      const content = readFileSync(middlewareFile, "utf8");

      if (!content.includes("csrf") && !content.includes("CSRF")) {
        this.findings.push({
          severity: "high",
          category: "CSRF",
          title: "CSRF protection not configured",
          description: "No CSRF protection found in middleware",
          recommendation:
            "Implement CSRF protection for state-changing operations",
          file: middlewareFile,
        });
      }
    }
  }

  private async checkContentSecurityPolicy(): Promise<void> {
    console.log("🔍 Checking Content Security Policy...");

    const nextConfig = join(this.projectRoot, "next.config.ts");
    if (existsSync(nextConfig)) {
      const content = readFileSync(nextConfig, "utf8");

      if (
        !content.includes("Content-Security-Policy") &&
        !content.includes("csp")
      ) {
        this.findings.push({
          severity: "medium",
          category: "CSP",
          title: "Content Security Policy not configured",
          description:
            "No Content Security Policy found in Next.js configuration",
          recommendation: "Configure Content Security Policy in next.config.ts",
          file: nextConfig,
        });
      }
    }
  }

  private async checkRateLimiting(): Promise<void> {
    console.log("🔍 Checking rate limiting...");

    const apiFiles = execSync('find app/api -name "*.ts" -type f', {
      stdio: "pipe",
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);

    let hasRateLimiting = false;
    apiFiles.forEach((file) => {
      if (existsSync(file)) {
        const content = readFileSync(file, "utf8");

        if (content.includes("rateLimit") || content.includes("rate-limit")) {
          hasRateLimiting = true;
        }
      }
    });

    if (!hasRateLimiting) {
      this.findings.push({
        severity: "medium",
        category: "Rate Limiting",
        title: "Rate limiting not configured",
        description: "No rate limiting found for API endpoints",
        recommendation: "Implement rate limiting to prevent abuse",
      });
    }
  }

  private async checkSessionSecurity(): Promise<void> {
    console.log("🔍 Checking session security...");

    const authFiles = execSync(
      'find . -name "*.ts" -exec grep -l "session\\|cookie" {} \\;',
      {
        stdio: "pipe",
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter(Boolean);

    authFiles.forEach((file) => {
      if (existsSync(file)) {
        const content = readFileSync(file, "utf8");

        // Check for secure cookie settings
        if (content.includes("cookie") && !content.includes("httpOnly")) {
          this.findings.push({
            severity: "high",
            category: "Session Security",
            title: "Cookies not configured as httpOnly",
            description: `Cookie configuration in ${file} may not be secure`,
            recommendation: "Set cookies as httpOnly and secure",
            file,
          });
        }

        // Check for session timeout
        if (
          content.includes("session") &&
          !content.includes("timeout") &&
          !content.includes("expire")
        ) {
          this.findings.push({
            severity: "medium",
            category: "Session Security",
            title: "Session timeout not configured",
            description: `Session configuration in ${file} may not have timeout`,
            recommendation: "Configure session timeout",
            file,
          });
        }
      }
    });
  }

  private async checkDataEncryption(): Promise<void> {
    console.log("🔍 Checking data encryption...");

    const dataFiles = execSync(
      'find . -name "*.ts" -exec grep -l "encrypt\\|decrypt\\|crypto" {} \\;',
      {
        stdio: "pipe",
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter(Boolean);

    dataFiles.forEach((file) => {
      if (existsSync(file)) {
        const content = readFileSync(file, "utf8");

        // Check for weak encryption
        if (content.includes("md5") || content.includes("sha1")) {
          this.findings.push({
            severity: "high",
            category: "Encryption",
            title: "Weak encryption algorithm",
            description: `Weak encryption algorithm found in ${file}`,
            recommendation:
              "Use stronger encryption algorithms (AES-256, SHA-256)",
            file,
          });
        }

        // Check for hardcoded encryption keys
        if (content.includes("key") && content.includes("=")) {
          this.findings.push({
            severity: "critical",
            category: "Encryption",
            title: "Potential hardcoded encryption key",
            description: `Potential hardcoded encryption key found in ${file}`,
            recommendation: "Store encryption keys in environment variables",
            file,
          });
        }
      }
    });
  }

  private async checkLoggingSecurity(): Promise<void> {
    console.log("🔍 Checking logging security...");

    const logFiles = execSync(
      'find . -name "*.ts" -exec grep -l "console.log\\|logger\\|log" {} \\;',
      {
        stdio: "pipe",
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter(Boolean);

    logFiles.forEach((file) => {
      if (existsSync(file)) {
        const content = readFileSync(file, "utf8");

        // Check for sensitive data in logs
        if (content.includes("password") && content.includes("log")) {
          this.findings.push({
            severity: "high",
            category: "Logging",
            title: "Sensitive data in logs",
            description: `Potential sensitive data logging in ${file}`,
            recommendation: "Sanitize log data to remove sensitive information",
            file,
          });
        }

        // Check for console.log in production
        if (content.includes("console.log") && !file.includes("test")) {
          this.findings.push({
            severity: "low",
            category: "Logging",
            title: "Console.log in production code",
            description: `Console.log statement found in ${file}`,
            recommendation:
              "Remove console.log statements or use proper logging",
            file,
          });
        }
      }
    });
  }

  private async checkThirdPartyIntegrations(): Promise<void> {
    console.log("🔍 Checking third-party integrations...");

    const packageJson = join(this.projectRoot, "package.json");
    if (existsSync(packageJson)) {
      const content = readFileSync(packageJson, "utf8");
      const pkg = JSON.parse(content);

      const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

      // Check for known vulnerable packages
      const vulnerablePackages = ["lodash", "moment", "request", "node-uuid"];

      vulnerablePackages.forEach((vulnPkg) => {
        if (dependencies[vulnPkg]) {
          this.findings.push({
            severity: "medium",
            category: "Third-party",
            title: `Potentially vulnerable package: ${vulnPkg}`,
            description: `Package ${vulnPkg} has known security issues`,
            recommendation: `Consider replacing ${vulnPkg} with a safer alternative`,
          });
        }
      });

      // Check for excessive permissions
      const highRiskPackages = Object.keys(dependencies).filter(
        (pkg) =>
          pkg.includes("fs") ||
          pkg.includes("exec") ||
          pkg.includes("child_process"),
      );

      if (highRiskPackages.length > 0) {
        this.findings.push({
          severity: "medium",
          category: "Third-party",
          title: "High-risk package dependencies",
          description: `Found packages with high-risk capabilities: ${highRiskPackages.join(", ")}`,
          recommendation: "Review and validate necessity of high-risk packages",
        });
      }
    }
  }

  private generateSecurityReport(): void {
    const report: SecurityReport = {
      summary: {
        total: this.findings.length,
        critical: this.findings.filter((f) => f.severity === "critical").length,
        high: this.findings.filter((f) => f.severity === "high").length,
        medium: this.findings.filter((f) => f.severity === "medium").length,
        low: this.findings.filter((f) => f.severity === "low").length,
        info: this.findings.filter((f) => f.severity === "info").length,
      },
      findings: this.findings,
      recommendations: this.generateRecommendations(),
    };

    // Console output
    console.log("\n🔒 SECURITY AUDIT REPORT");
    console.log("=".repeat(50));
    console.log("\n📊 SUMMARY:");
    console.log(`Total Issues: ${report.summary.total}`);
    console.log(`🔴 Critical: ${report.summary.critical}`);
    console.log(`🟠 High: ${report.summary.high}`);
    console.log(`🟡 Medium: ${report.summary.medium}`);
    console.log(`🔵 Low: ${report.summary.low}`);
    console.log(`ℹ️  Info: ${report.summary.info}`);

    if (this.findings.length > 0) {
      console.log("\n🔍 DETAILED FINDINGS:");
      console.log("-".repeat(30));

      this.findings.forEach((finding, index) => {
        const severityIcon = {
          critical: "🔴",
          high: "🟠",
          medium: "🟡",
          low: "🔵",
          info: "ℹ️",
        }[finding.severity];

        console.log(`\n${index + 1}. ${severityIcon} ${finding.title}`);
        console.log(`   Category: ${finding.category}`);
        console.log(`   Description: ${finding.description}`);
        console.log(`   Recommendation: ${finding.recommendation}`);
        if (finding.file) {
          console.log(`   File: ${finding.file}`);
        }
      });

      console.log("\n💡 TOP RECOMMENDATIONS:");
      console.log("-".repeat(30));
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    } else {
      console.log("\n✅ NO SECURITY ISSUES FOUND!");
    }

    // Save report to file
    const reportPath = join(this.projectRoot, "security-audit-report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Generate score
    const score = Math.max(
      0,
      100 -
        (report.summary.critical * 20 +
          report.summary.high * 10 +
          report.summary.medium * 5 +
          report.summary.low * 1),
    );
    console.log(`\n🎯 SECURITY SCORE: ${score}/100`);

    if (score >= 90) {
      console.log("🟢 EXCELLENT - Your application is secure!");
    } else if (score >= 70) {
      console.log("🟡 GOOD - Some security improvements needed");
    } else if (score >= 50) {
      console.log("🟠 NEEDS IMPROVEMENT - Address security issues");
    } else {
      console.log("🔴 CRITICAL - Immediate security fixes required");
    }

    console.log(`\n${"=".repeat(50)}`);
  }

  private generateRecommendations(): string[] {
    const recommendations: any[] = [];

    if (this.findings.some((f) => f.category === "Dependencies")) {
      recommendations.push("Update all dependencies to latest secure versions");
    }

    if (this.findings.some((f) => f.category === "Secrets")) {
      recommendations.push("Move all secrets to environment variables");
    }

    if (this.findings.some((f) => f.category === "Authentication")) {
      recommendations.push(
        "Implement proper authentication and session management",
      );
    }

    if (this.findings.some((f) => f.category === "Security Headers")) {
      recommendations.push("Configure security headers in middleware");
    }

    if (this.findings.some((f) => f.category === "Input Validation")) {
      recommendations.push("Add input validation to all API endpoints");
    }

    if (this.findings.some((f) => f.severity === "critical")) {
      recommendations.push("Address all critical security issues immediately");
    }

    return recommendations;
  }
}

// Run the security audit
const auditor = new SecurityAuditor();
auditor.runSecurityAudit().catch(console.error);
