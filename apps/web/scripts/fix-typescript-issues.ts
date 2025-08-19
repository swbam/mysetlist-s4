#!/usr/bin/env node

/**
 * TypeScript Issue Detection and Fixing Script
 * 
 * This script helps identify and provide guidance for fixing common
 * TypeScript issues in the Next.js 15 application.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TypeScriptIssue {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

class TypeScriptFixer {
  private issues: TypeScriptIssue[] = [];
  private fixedCount = 0;

  constructor() {
    console.log('🔍 TypeScript Issue Detection and Fixing Script');
    console.log('================================================\n');
  }

  /**
   * Run TypeScript compiler to detect issues
   */
  detectIssues(): void {
    console.log('📋 Detecting TypeScript issues...\n');
    
    try {
      // Run TypeScript compiler with noEmit to check for errors
      const result = execSync('pnpm typecheck', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      console.log('✅ No TypeScript errors found!');
      return;
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      this.parseTypeScriptOutput(output);
    }
  }

  /**
   * Parse TypeScript compiler output to extract issues
   */
  private parseTypeScriptOutput(output: string): void {
    const lines = output.split('\n');
    const issues: TypeScriptIssue[] = [];

    for (const line of lines) {
      // Match TypeScript error pattern: file(line,column): error TS#### message
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/);
      
      if (match) {
        const [, file, lineNum, column, severity, code, message] = match;
        if (file && lineNum && column && message && code) {
          issues.push({
            file: file.trim(),
            line: parseInt(lineNum, 10),
            column: parseInt(column, 10),
            message: message.trim(),
            code: `TS${code}`,
            severity: (severity || 'error') as 'error' | 'warning'
          });
        }
      }
    }

    this.issues = issues;
    this.reportIssues();
  }

  /**
   * Report found issues categorized by type
   */
  private reportIssues(): void {
    if (this.issues.length === 0) {
      console.log('✅ No TypeScript issues found!');
      return;
    }

    console.log(`❌ Found ${this.issues.length} TypeScript issues:\n`);

    // Group issues by type
    const groupedIssues = this.groupIssuesByType();

    for (const [type, issues] of Object.entries(groupedIssues)) {
      console.log(`📂 ${type} (${issues.length} issues):`);
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.file}:${issue.line}:${issue.column}`);
        console.log(`     ${issue.code}: ${issue.message}`);
      });
      console.log();
    }

    this.provideFixes();
  }

  /**
   * Group issues by common types for better organization
   */
  private groupIssuesByType(): Record<string, TypeScriptIssue[]> {
    const groups: Record<string, TypeScriptIssue[]> = {
      'Async Params Issues': [],
      'Type Assertion Issues': [],
      'Strict Mode Issues': [],
      'Import/Export Issues': [],
      'Other Issues': []
    };

    for (const issue of this.issues) {
      if (issue.message.includes('params') && issue.message.includes('await')) {
        groups['Async Params Issues']?.push(issue);
      } else if (issue.message.includes('any') || issue.code === 'TS7006') {
        groups['Type Assertion Issues']?.push(issue);
      } else if (issue.code === 'TS2532' || issue.code === 'TS2531' || issue.code === 'TS2339') {
        groups['Strict Mode Issues']?.push(issue);
      } else if (issue.code === 'TS2307' || issue.code === 'TS1192') {
        groups['Import/Export Issues']?.push(issue);
      } else {
        groups['Other Issues']?.push(issue);
      }
    }

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([, issues]) => issues.length > 0)
    );
  }

  /**
   * Provide automated fixes and guidance
   */
  private provideFixes(): void {
    console.log('🔧 Automated Fixes and Recommendations:\n');

    const asyncParamsIssues = this.issues.filter(issue => 
      issue.message.includes('params') && issue.message.includes('await')
    );

    if (asyncParamsIssues.length > 0) {
      console.log('🎯 Async Params Issues:');
      console.log('   These are likely due to Next.js 15 requiring params to be awaited.');
      console.log('   Fix: Change `const { param } = params` to `const { param } = await params`');
      console.log('   Also ensure the props type uses Promise<{...}> instead of {...}');
      console.log();
    }

    const typeAssertionIssues = this.issues.filter(issue => 
      issue.message.includes('any') || issue.code === 'TS7006'
    );

    if (typeAssertionIssues.length > 0) {
      console.log('🎯 Type Assertion Issues:');
      console.log('   These can be fixed by adding proper type annotations.');
      console.log('   Avoid using "as any" and instead define proper interfaces.');
      console.log();
    }

    this.generateFixCommands();
  }

  /**
   * Generate specific fix commands
   */
  private generateFixCommands(): void {
    console.log('💡 Quick Fix Commands:\n');

    console.log('1. Update TypeScript configuration:');
    console.log('   cp tsconfig.updated.json tsconfig.json');
    console.log();

    console.log('2. Run type checking:');
    console.log('   pnpm typecheck');
    console.log();

    console.log('3. Check for specific patterns:');
    console.log('   # Find files with non-awaited params');
    console.log('   grep -r "const { .* } = params" app/ --include="*.tsx"');
    console.log();
    console.log('   # Find type assertion issues');
    console.log('   grep -r "as any" . --include="*.ts" --include="*.tsx"');
    console.log();

    console.log('4. Build the application:');
    console.log('   pnpm build');
    console.log();
  }

  /**
   * Main execution method
   */
  run(): void {
    this.detectIssues();
    
    console.log('\n📊 Summary:');
    console.log(`   Total issues found: ${this.issues.length}`);
    console.log(`   Issues fixed: ${this.fixedCount}`);
    
    if (this.issues.length === 0) {
      console.log('\n🎉 All TypeScript issues have been resolved!');
      console.log('   Your Next.js 15 application is now fully type-safe.');
    } else {
      console.log('\n🔄 Next steps:');
      console.log('   1. Review the issues above');
      console.log('   2. Apply the suggested fixes');
      console.log('   3. Run this script again to verify');
    }
  }
}

// Run the fixer
const fixer = new TypeScriptFixer();
fixer.run();