#!/usr/bin/env tsx

/**
 * Image Optimization Audit Script
 *
 * This script audits image usage across the application to ensure:
 * 1. All images use Next.js Image component
 * 2. Images have proper alt text for accessibility
 * 3. Images have appropriate sizing
 * 4. Image sources are optimized
 */

import { readFileSync } from "fs";
import { glob } from "glob";
import path from "path";

interface ImageIssue {
  filePath: string;
  lineNumber: number;
  line: string;
  issue: string;
  severity: "error" | "warning" | "info";
  suggestion: string;
}

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;
const NEXT_IMAGE_PATTERN = /import\s+.*Image.*from\s+['"]next\/image['"]/;
const HTML_IMG_PATTERN = /<img\s+[^>]*src\s*=\s*['"][^'"]*['"][^>]*>/gi;
const NEXT_IMG_PATTERN = /<Image\s+[^>]*>/gi;

function extractImageAttributes(
  imgTag: string,
): Record<string, string | undefined> {
  const attrs: Record<string, string | undefined> = {};

  // Extract src
  const srcMatch = imgTag.match(/src\s*=\s*['"]([^'"]*)['"]/i);
  if (srcMatch) attrs.src = srcMatch[1];

  // Extract alt
  const altMatch = imgTag.match(/alt\s*=\s*['"]([^'"]*)['"]/i);
  if (altMatch) attrs.alt = altMatch[1];

  // Extract width
  const widthMatch = imgTag.match(/width\s*=\s*(?:['"]([^'"]*)['"]|(\d+))/i);
  if (widthMatch) attrs.width = widthMatch[1] || widthMatch[2];

  // Extract height
  const heightMatch = imgTag.match(/height\s*=\s*(?:['"]([^'"]*)['"]|(\d+))/i);
  if (heightMatch) attrs.height = heightMatch[1] || heightMatch[2];

  // Extract sizes
  const sizesMatch = imgTag.match(/sizes\s*=\s*['"]([^'"]*)['"]/i);
  if (sizesMatch) attrs.sizes = sizesMatch[1];

  // Extract priority
  const priorityMatch = imgTag.match(
    /priority\s*(?:=\s*(?:true|['"]true['"]))?/i,
  );
  if (priorityMatch) attrs.priority = "true";

  return attrs;
}

function isStaticImageImport(src: string): boolean {
  return (
    src.startsWith("/") ||
    src.startsWith("./") ||
    src.startsWith("../") ||
    !src.includes("://")
  );
}

function checkImageOptimization(filePath: string): ImageIssue[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const issues: ImageIssue[] = [];
  const relativePath = path.relative(process.cwd(), filePath);

  // Check if file imports Next.js Image component
  const hasNextImageImport = NEXT_IMAGE_PATTERN.test(content);

  // Check if Image is imported from lucide-react (icon component)
  const hasLucideImageImport =
    /import\s+.*\{\s*[^}]*Image[^}]*\}\s*from\s+['"]lucide-react['"]/.test(
      content,
    );

  // Find all HTML img tags
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    // Check for HTML img tags
    HTML_IMG_PATTERN.lastIndex = 0;
    let htmlImgMatch;
    while ((htmlImgMatch = HTML_IMG_PATTERN.exec(line)) !== null) {
      const imgTag = htmlImgMatch[0];
      const attrs = extractImageAttributes(imgTag);

      issues.push({
        filePath: relativePath,
        lineNumber,
        line: trimmedLine,
        issue: "Using HTML img tag instead of Next.js Image component",
        severity: "error",
        suggestion: `Replace <img> with <Image> from 'next/image' for automatic optimization. Import: import Image from 'next/image'`,
      });

      // Check alt text for HTML img
      if (!attrs.alt || attrs.alt.trim() === "") {
        issues.push({
          filePath: relativePath,
          lineNumber,
          line: trimmedLine,
          issue: "Missing alt text for accessibility",
          severity: "error",
          suggestion: 'Add meaningful alt text: alt="Description of the image"',
        });
      }
    }

    // Check Next.js Image components (skip if Image is from lucide-react)
    if (!hasLucideImageImport || !line.includes("<Image")) {
      NEXT_IMG_PATTERN.lastIndex = 0;
      let nextImgMatch;
      while ((nextImgMatch = NEXT_IMG_PATTERN.exec(line)) !== null) {
        const imgTag = nextImgMatch[0];
        const attrs = extractImageAttributes(imgTag);

        // Only check for Next.js Image issues if this looks like an actual image component with src
        if (attrs.src) {
          // Check alt text
          if (!attrs.alt || attrs.alt.trim() === "") {
            issues.push({
              filePath: relativePath,
              lineNumber,
              line: trimmedLine,
              issue: "Next.js Image missing alt text",
              severity: "error",
              suggestion:
                'Add alt text for accessibility: alt="Description of the image"',
            });
          }

          // Check dimensions for static images
          if (isStaticImageImport(attrs.src)) {
            if (!attrs.width || !attrs.height) {
              issues.push({
                filePath: relativePath,
                lineNumber,
                line: trimmedLine,
                issue: "Missing width/height for static image",
                severity: "warning",
                suggestion:
                  "Add width and height attributes for better performance: width={500} height={300}",
              });
            }
          }

          // Check for appropriate sizes attribute for responsive images
          if (attrs.src.includes("://") && !attrs.sizes && !attrs.width) {
            issues.push({
              filePath: relativePath,
              lineNumber,
              line: trimmedLine,
              issue: "Missing sizes attribute for responsive image",
              severity: "info",
              suggestion:
                'Add sizes attribute for responsive images: sizes="(max-width: 768px) 100vw, 50vw"',
            });
          }

          // Check for priority on above-the-fold images
          if (
            filePath.includes("hero") ||
            filePath.includes("banner") ||
            filePath.includes("header") ||
            relativePath.includes("(home)/components")
          ) {
            if (!attrs.priority) {
              issues.push({
                filePath: relativePath,
                lineNumber,
                line: trimmedLine,
                issue: "Consider adding priority for above-the-fold image",
                severity: "info",
                suggestion:
                  "Add priority attribute for LCP optimization: priority={true}",
              });
            }
          }
        }
      }
    }

    // Check for hardcoded image URLs that could be optimized
    const hardcodedImageUrls = line.match(
      /['"]https?:\/\/[^'"]*\.(jpg|jpeg|png|gif|webp)['"]?/gi,
    );
    if (hardcodedImageUrls) {
      hardcodedImageUrls.forEach((url) => {
        // Skip known CDNs that are already optimized
        if (
          !url.includes("scdn.co") &&
          !url.includes("ticketm.net") &&
          !url.includes("unsplash.com")
        ) {
          issues.push({
            filePath: relativePath,
            lineNumber,
            line: trimmedLine,
            issue: "Hardcoded image URL detected",
            severity: "info",
            suggestion:
              "Consider using Next.js Image component with this URL for optimization",
          });
        }
      });
    }
  });

  // Check if Next.js Image import is missing when img tags are present
  if (
    issues.some((i) => i.issue.includes("HTML img tag")) &&
    !hasNextImageImport
  ) {
    issues.push({
      filePath: relativePath,
      lineNumber: 1,
      line: "File header",
      issue: "Missing Next.js Image import",
      severity: "error",
      suggestion: `Add import at top of file: import Image from 'next/image';`,
    });
  }

  return issues;
}

async function main() {
  console.log("🖼️  Starting image optimization audit...\n");

  const files = await glob(["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"], {
    cwd: process.cwd(),
    absolute: true,
    ignore: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "**/*.test.*",
      "**/*.spec.*",
    ],
  });

  console.log(`📁 Scanning ${files.length} files for image usage...\n`);

  let totalIssues = 0;
  const issuesBySeverity = { error: 0, warning: 0, info: 0 };
  const allIssues: ImageIssue[] = [];

  for (const file of files) {
    const issues = checkImageOptimization(file);
    allIssues.push(...issues);
    totalIssues += issues.length;

    if (issues.length > 0) {
      const filePath = path.relative(process.cwd(), file);
      console.log(`🔍 ${filePath}:`);

      issues.forEach((issue) => {
        issuesBySeverity[issue.severity]++;
        const icon =
          issue.severity === "error"
            ? "❌"
            : issue.severity === "warning"
              ? "⚠️"
              : "ℹ️";
        console.log(`   ${icon} Line ${issue.lineNumber}: ${issue.issue}`);
        console.log(`      💡 ${issue.suggestion}`);
      });
      console.log("");
    }
  }

  // Generate summary
  console.log("📊 Image Optimization Audit Summary:");
  console.log(`   ❌ Errors: ${issuesBySeverity.error}`);
  console.log(`   ⚠️  Warnings: ${issuesBySeverity.warning}`);
  console.log(`   ℹ️  Info: ${issuesBySeverity.info}`);
  console.log(`   📄 Files scanned: ${files.length}`);
  console.log(`   🔍 Total issues found: ${totalIssues}`);

  // Generate recommendations
  console.log("\n🎯 Key Recommendations:");

  const errorCount = issuesBySeverity.error;
  if (errorCount > 0) {
    console.log(
      `   1. Fix ${errorCount} critical image issues (missing alt text, HTML img tags)`,
    );
  }

  const htmlImgCount = allIssues.filter((i) =>
    i.issue.includes("HTML img tag"),
  ).length;
  if (htmlImgCount > 0) {
    console.log(
      `   2. Replace ${htmlImgCount} HTML img tags with Next.js Image components`,
    );
  }

  const altTextIssues = allIssues.filter((i) =>
    i.issue.includes("alt text"),
  ).length;
  if (altTextIssues > 0) {
    console.log(
      `   3. Add alt text to ${altTextIssues} images for accessibility`,
    );
  }

  const dimensionIssues = allIssues.filter((i) =>
    i.issue.includes("width/height"),
  ).length;
  if (dimensionIssues > 0) {
    console.log(
      `   4. Add dimensions to ${dimensionIssues} images for better performance`,
    );
  }

  if (totalIssues === 0) {
    console.log("\n✅ No image optimization issues found - great job!");
  } else {
    console.log("\n🔧 Run the following to see Next.js Image documentation:");
    console.log(
      "   👀 https://nextjs.org/docs/app/api-reference/components/image",
    );
  }
}

if (require.main === module) {
  main().catch(console.error);
}
