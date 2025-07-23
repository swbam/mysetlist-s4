#!/usr/bin/env tsx

/**
 * Bundle Analysis and Optimization Script
 * Analyzes bundle sizes and identifies optimization opportunities
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface BundleAnalysis {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  largestFiles: Array<{ file: string; size: number }>;
  duplicates: string[];
  unusedImports: string[];
  opportunities: string[];
}

class BundleAnalyzer {
  private projectRoot: string;
  private buildDir: string;
  
  constructor() {
    this.projectRoot = process.cwd();
    this.buildDir = path.join(this.projectRoot, '.next');
  }

  async analyzeBundleSize(): Promise<BundleAnalysis> {
    console.log('🔍 Analyzing bundle size...');
    
    // Build the project first
    try {
      console.log('Building project...');
      execSync('npm run build', { stdio: 'pipe' });
    } catch (error) {
      console.error('Build failed:', error);
      throw error;
    }

    const analysis: BundleAnalysis = {
      totalSize: 0,
      jsSize: 0,
      cssSize: 0,
      largestFiles: [],
      duplicates: [],
      unusedImports: [],
      opportunities: []
    };

    // Analyze static files
    const staticDir = path.join(this.buildDir, 'static');
    await this.analyzeDirectory(staticDir, analysis);

    // Find large files
    analysis.largestFiles.sort((a, b) => b.size - a.size);
    analysis.largestFiles = analysis.largestFiles.slice(0, 10);

    // Identify optimization opportunities
    this.identifyOptimizations(analysis);

    return analysis;
  }

  private async analyzeDirectory(dir: string, analysis: BundleAnalysis): Promise<void> {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          await this.analyzeDirectory(filePath, analysis);
        } else {
          const stats = await fs.stat(filePath);
          const size = stats.size;
          
          analysis.totalSize += size;
          
          if (file.name.endsWith('.js') || file.name.endsWith('.js.map')) {
            analysis.jsSize += size;
          } else if (file.name.endsWith('.css')) {
            analysis.cssSize += size;
          }
          
          analysis.largestFiles.push({
            file: path.relative(this.projectRoot, filePath),
            size
          });
        }
      }
    } catch (error) {
      console.warn(`Could not analyze directory: ${dir}`);
    }
  }

  private identifyOptimizations(analysis: BundleAnalysis): void {
    const { largestFiles, totalSize } = analysis;
    
    // Check for large bundles
    largestFiles.forEach(({ file, size }) => {
      const sizeKB = size / 1024;
      
      if (sizeKB > 500) {
        analysis.opportunities.push(
          `📦 Large bundle detected: ${file} (${sizeKB.toFixed(1)}KB) - Consider code splitting`
        );
      }
      
      if (file.includes('vendor') && sizeKB > 200) {
        analysis.opportunities.push(
          `📚 Large vendor bundle: ${file} (${sizeKB.toFixed(1)}KB) - Review dependencies`
        );
      }
    });

    // Overall size warnings
    const totalMB = totalSize / (1024 * 1024);
    if (totalMB > 2) {
      analysis.opportunities.push(
        `⚠️ Total bundle size is ${totalMB.toFixed(1)}MB - Consider aggressive code splitting and tree shaking`
      );
    }
  }

  async findUnusedImports(): Promise<string[]> {
    console.log('🔍 Scanning for unused imports...');
    
    const unusedImports: string[] = [];
    const srcDir = path.join(this.projectRoot, 'app');
    
    try {
      // Use a simple regex-based approach to find imports
      const files = await this.getFilesRecursively(srcDir, ['.tsx', '.ts']);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const imports = this.extractImports(content);
        const used = this.findUsedImports(content, imports);
        
        const unused = imports.filter(imp => !used.includes(imp.name));
        unused.forEach(imp => {
          unusedImports.push(`${path.relative(this.projectRoot, file)}: ${imp.name} from ${imp.source}`);
        });
      }
    } catch (error) {
      console.warn('Could not analyze unused imports:', error);
    }
    
    return unusedImports;
  }

  private async getFilesRecursively(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, extensions);
          files.push(...subFiles);
        } else if (extensions.some(ext => item.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore inaccessible directories
    }
    
    return files;
  }

  private extractImports(content: string): Array<{ name: string; source: string }> {
    const imports: Array<{ name: string; source: string }> = [];
    
    // Match import statements
    const importRegex = /import\s+(?:{\s*([^}]+)\s*}|([^,\s]+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, namedImports, defaultImport, source] = match;
      
      if (namedImports) {
        namedImports.split(',').forEach(imp => {
          const name = imp.trim();
          if (name) imports.push({ name, source });
        });
      }
      
      if (defaultImport) {
        imports.push({ name: defaultImport.trim(), source });
      }
    }
    
    return imports;
  }

  private findUsedImports(content: string, imports: Array<{ name: string; source: string }>): string[] {
    const used: string[] = [];
    
    imports.forEach(({ name }) => {
      // Simple check if the import name appears in the content
      const usageRegex = new RegExp(`\\b${name}\\b`, 'g');
      const matches = content.match(usageRegex);
      
      // If it appears more than once (once for import, once for usage)
      if (matches && matches.length > 1) {
        used.push(name);
      }
    });
    
    return used;
  }

  async findDuplicateDependencies(): Promise<string[]> {
    console.log('🔍 Scanning for duplicate dependencies...');
    
    try {
      // Check for duplicate packages in node_modules
      const output = execSync('npm ls --depth=0 --json', { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      const packageInfo = JSON.parse(output);
      const duplicates: string[] = [];
      
      // This is a simplified check - in a real scenario you'd want more sophisticated detection
      const packages = Object.keys(packageInfo.dependencies || {});
      packages.forEach(pkg => {
        if (packages.filter(p => p.includes(pkg.split('/')[0] || pkg)).length > 1) {
          duplicates.push(pkg);
        }
      });
      
      return duplicates;
    } catch (error) {
      console.warn('Could not analyze duplicate dependencies:', error);
      return [];
    }
  }

  generateReport(analysis: BundleAnalysis): void {
    console.log('\n📊 Bundle Analysis Report');
    console.log('='.repeat(50));
    
    console.log(`\n📦 Total Bundle Size: ${(analysis.totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📜 JavaScript: ${(analysis.jsSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`🎨 CSS: ${(analysis.cssSize / 1024).toFixed(2)} KB`);
    
    console.log('\n🏆 Largest Files:');
    analysis.largestFiles.forEach(({ file, size }) => {
      console.log(`  • ${file}: ${(size / 1024).toFixed(1)} KB`);
    });
    
    if (analysis.unusedImports.length > 0) {
      console.log('\n🚫 Unused Imports:');
      analysis.unusedImports.slice(0, 10).forEach(imp => {
        console.log(`  • ${imp}`);
      });
    }
    
    if (analysis.duplicates.length > 0) {
      console.log('\n🔄 Duplicate Dependencies:');
      analysis.duplicates.forEach(dep => {
        console.log(`  • ${dep}`);
      });
    }
    
    console.log('\n🚀 Optimization Opportunities:');
    if (analysis.opportunities.length === 0) {
      console.log('  ✅ No major optimization opportunities detected!');
    } else {
      analysis.opportunities.forEach(opportunity => {
        console.log(`  ${opportunity}`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    this.generateRecommendations(analysis);
  }

  private generateRecommendations(analysis: BundleAnalysis): void {
    const recommendations = [];
    
    if (analysis.totalSize > 2 * 1024 * 1024) {
      recommendations.push('• Implement aggressive code splitting');
      recommendations.push('• Use dynamic imports for non-critical components');
      recommendations.push('• Enable tree shaking optimization');
    }
    
    if (analysis.jsSize > analysis.totalSize * 0.8) {
      recommendations.push('• Consider extracting large dependencies to separate chunks');
      recommendations.push('• Implement proper code splitting for routes');
    }
    
    if (analysis.unusedImports.length > 10) {
      recommendations.push('• Remove unused imports to reduce bundle size');
      recommendations.push('• Set up ESLint rules to prevent unused imports');
    }
    
    recommendations.push('• Enable Gzip/Brotli compression on server');
    recommendations.push('• Use React.lazy() for component-level code splitting');
    recommendations.push('• Implement service worker for caching');
    
    recommendations.forEach(rec => console.log(rec));
  }
}

// Run the analysis
async function main() {
  const analyzer = new BundleAnalyzer();
  
  try {
    const analysis = await analyzer.analyzeBundleSize();
    
    // Find unused imports
    analysis.unusedImports = await analyzer.findUnusedImports();
    
    // Find duplicate dependencies
    analysis.duplicates = await analyzer.findDuplicateDependencies();
    
    // Generate report
    analyzer.generateReport(analysis);
    
    // Save detailed report
    await fs.writeFile(
      'bundle-analysis-report.json',
      JSON.stringify(analysis, null, 2)
    );
    
    console.log('\n💾 Detailed report saved to bundle-analysis-report.json');
    
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}