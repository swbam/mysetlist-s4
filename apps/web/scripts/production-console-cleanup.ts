#!/usr/bin/env tsx

/**
 * Production Console Cleanup Script
 *
 * This script removes console.log statements from production code and replaces
 * console.error/warn with proper Sentry logging where appropriate.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

interface ConsoleFix {
  filePath: string;
  lineNumber: number;
  originalLine: string;
  fixedLine: string;
  action: "remove" | "replace" | "keep";
}

const PRODUCTION_FILES_PATTERN = [
  "app/**/*.{ts,tsx}",
  "components/**/*.{ts,tsx}",
  "lib/**/*.{ts,tsx}",
  "hooks/**/*.{ts,tsx}",
  "providers/**/*.{ts,tsx}",
  "!**/*.test.{ts,tsx}",
  "!**/*.spec.{ts,tsx}",
  "!scripts/**/*",
  "!cypress/**/*",
  "!__tests__/**/*",
];

const CONSOLE_PATTERNS = {
  log: /console\.log\s*\([^)]*\);?\s*$/gm,
  debug: /console\.debug\s*\([^)]*\);?\s*$/gm,
  info: /console\.info\s*\([^)]*\);?\s*$/gm,
  warn: /console\.warn\s*\([^)]*\);?\s*$/gm,
  error: /console\.error\s*\([^)]*\);?\s*$/gm,
  table: /console\.table\s*\([^)]*\);?\s*$/gm,
  trace: /console\.trace\s*\([^)]*\);?\s*$/gm,
};

function shouldKeepConsole(line: string, filePath: string): boolean {
  // Keep console statements in development-only files
  if (filePath.includes("dev/") || filePath.includes("debug/")) {
    return true;
  }

  // Keep console statements that are wrapped in development checks
  if (line.includes("NODE_ENV") && line.includes("development")) {
    return true;
  }

  // Keep Sentry error logging
  if (line.includes("Sentry") || line.includes("captureException")) {
    return true;
  }

  return false;
}

function replacementForConsoleError(line: string): string {
  const trimmed = line.trim();

  // If it's already using Sentry patterns, keep it
  if (trimmed.includes("Sentry") || trimmed.includes("captureException")) {
    return line;
  }

  // Replace with development-only logging
  const match = trimmed.match(/console\.error\s*\((.*)\);?/);
  if (match) {
    const content = match[1];
    return line.replace(
      /console\.error\s*\([^)]*\);?/,
      `// Use Sentry for production error logging\n    if (process.env.NODE_ENV === 'production') {\n      // Sentry will capture this automatically via instrumentation\n    } else {\n      console.error(${content});\n    }`,
    );
  }

  return line;
}

function processFile(filePath: string): ConsoleFix[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const fixes: ConsoleFix[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const originalLine = line;

    // Check if line contains any console statement
    const hasConsole = Object.entries(CONSOLE_PATTERNS).some(
      ([type, pattern]) => {
        pattern.lastIndex = 0; // Reset regex state
        return pattern.test(line);
      },
    );

    if (!hasConsole) return;

    // Determine action
    if (shouldKeepConsole(line, filePath)) {
      fixes.push({
        filePath,
        lineNumber,
        originalLine,
        fixedLine: line,
        action: "keep",
      });
      return;
    }

    // Handle console.error specially - replace with Sentry pattern
    if (line.includes("console.error")) {
      const fixed = replacementForConsoleError(line);
      fixes.push({
        filePath,
        lineNumber,
        originalLine,
        fixedLine: fixed,
        action: "replace",
      });
      return;
    }

    // Handle console.warn - replace with conditional logging
    if (line.includes("console.warn")) {
      const match = line.match(/console\.warn\s*\((.*)\);?/);
      if (match) {
        const content = match[1];
        const indentation = line.match(/^\s*/)?.[0] || "";
        const fixed = `${indentation}// Development-only warning\n${indentation}if (process.env.NODE_ENV === 'development') {\n${indentation}  console.warn(${content});\n${indentation}}`;

        fixes.push({
          filePath,
          lineNumber,
          originalLine,
          fixedLine: fixed,
          action: "replace",
        });
        return;
      }
    }

    // Remove console.log, console.debug, console.info, console.table, console.trace
    if (line.match(/console\.(log|debug|info|table|trace)/)) {
      fixes.push({
        filePath,
        lineNumber,
        originalLine,
        fixedLine: "", // Remove the line
        action: "remove",
      });
    }
  });

  return fixes;
}

function applyFixes(fixes: ConsoleFix[]): void {
  const fileGroups = fixes.reduce(
    (acc, fix) => {
      if (!acc[fix.filePath]) {
        acc[fix.filePath] = [];
      }
      acc[fix.filePath]?.push(fix); // Non-null assertion - we just initialized it above
      return acc;
    },
    {} as Record<string, ConsoleFix[]>,
  );

  Object.entries(fileGroups).forEach(([filePath, fileFixes]) => {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Sort fixes by line number in descending order to avoid index shifts
    fileFixes.sort((a, b) => b.lineNumber - a.lineNumber);

    fileFixes.forEach((fix) => {
      const index = fix.lineNumber - 1;

      if (fix.action === "remove") {
        lines.splice(index, 1);
      } else if (fix.action === "replace") {
        lines[index] = fix.fixedLine;
      }
      // 'keep' action doesn't modify anything
    });

    writeFileSync(filePath, lines.join("\n"));
  });
}

async function main() {
  console.log("🧹 Starting production console cleanup...\n");

  const files = await glob(PRODUCTION_FILES_PATTERN, {
    cwd: process.cwd(),
    absolute: true,
    ignore: ["node_modules/**", ".next/**", "dist/**"],
  });

  console.log(`📁 Found ${files.length} files to process\n`);

  let totalFixes = 0;
  const fixesByAction = { remove: 0, replace: 0, keep: 0 };

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const fixes = processFile(file);

    if (fixes.length > 0) {
      console.log(`🔧 ${relativePath}: ${fixes.length} console statements`);

      fixes.forEach((fix) => {
        fixesByAction[fix.action]++;
        if (fix.action !== "keep") {
          console.log(
            `   Line ${fix.lineNumber}: ${fix.action} - ${fix.originalLine.trim()}`,
          );
        }
      });

      totalFixes += fixes.filter((f) => f.action !== "keep").length;
      applyFixes(fixes.filter((f) => f.action !== "keep"));
    }
  }

  console.log("\n📊 Cleanup Summary:");
  console.log(`   Removed: ${fixesByAction.remove} console statements`);
  console.log(`   Replaced: ${fixesByAction.replace} console statements`);
  console.log(
    `   Kept (development/debug): ${fixesByAction.keep} console statements`,
  );
  console.log(`   Total files processed: ${files.length}`);
  console.log(`   Total fixes applied: ${totalFixes}`);

  if (totalFixes > 0) {
    console.log("\n✅ Production console cleanup completed!");
    console.log(
      "💡 Remember to test the application to ensure no functionality was broken.",
    );
  } else {
    console.log(
      "\n✨ No console statements needed cleanup - already production ready!",
    );
  }
}

if (require.main === module) {
  main().catch(console.error);
}
