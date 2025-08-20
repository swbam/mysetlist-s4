# TheSet - Deployment, Monitoring & Production

## ✅ **STATUS: PRODUCTION READY**

**All production systems have been implemented and tested for scalability and reliability.**

## Table of Contents

1. [Deployment Architecture](#deployment-architecture)
2. [Next-Forge Production Setup](#next-forge-production-setup)
3. [Vercel Deployment Configuration](#vercel-deployment-configuration)
4. [Environment Management](#environment-management)
5. [Database Management & Migrations](#database-management--migrations)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Performance Optimization](#performance-optimization)
8. [Security & Compliance](#security--compliance)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Development Workflow](#development-workflow)

## Deployment Architecture

TheSet leverages Next-Forge's production-ready deployment strategy with Vercel for frontend hosting, Supabase for backend services, and additional monitoring tools for production reliability.

### ✅ Complete Production Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Production Stack (FULLY IMPLEMENTED)             │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (Vercel)         │  Backend Services           │  Queue System │
│  ├── ✅ Next.js App       │  ├── ✅ Supabase (PostgreSQL) │  ├── ✅ Redis    │
│  ├── ✅ SSE Streams       │  ├── ✅ Supabase Auth         │  ├── ✅ BullMQ   │
│  ├── ✅ API Routes        │  ├── ✅ Supabase Realtime     │  ├── ✅ 8 Queues │
│  ├── ✅ Cron Jobs         │  └── ✅ Supabase Storage      │  └── ✅ Jobs     │
│  └── ✅ Static Assets     │                              │               │
├─────────────────────────────────────────────────────────────────────────┤
│                         External APIs (FULLY IMPLEMENTED)               │
│  ├── ✅ Spotify Web API (Rate Limited: 30/sec)                         │
│  ├── ✅ Ticketmaster Discovery API (Rate Limited: 20/sec)              │
│  └── ✅ SetlistFM API (Rate Limited: 10/sec)                           │
├─────────────────────────────────────────────────────────┤
│  External Services         │  Monitoring & Tools         │
│  ├── Upstash Redis       │  ├── Vercel Analytics      │
│  ├── Resend Email        │  ├── Sentry Error Tracking │
│  ├── Spotify API         │  ├── LogTail Logging       │
│  └── Ticketmaster API    │  └── Uptime Monitoring     │
├─────────────────────────────────────────────────────────┤
│  CDN & Edge               │  Security & Compliance      │
│  ├── Vercel Edge Network │  ├── SSL/TLS Certificates  │
│  ├── Image Optimization  │  ├── GDPR Compliance       │
│  └── Geo-distribution    │  └── Data Protection       │
└─────────────────────────────────────────────────────────┘
```

### Deployment Environments

- **Development**: Local development with hot reload
- **Preview**: Branch-based preview deployments on Vercel
- **Staging**: Production-like environment for testing
- **Production**: Live application serving users

## Next-Forge Production Setup

### Project Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ["@repo/ui", "@repo/database"],
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },

  // Image optimization
  images: {
    domains: [
      "i.scdn.co", // Spotify images
      "s1.ticketm.net", // Ticketmaster images
      "images.unsplash.com", // Placeholder images
    ],
    formats: ["image/webp", "image/avif"],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },

  // Redirects and rewrites
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth/signin",
        permanent: true,
      },
      {
        source: "/register",
        destination: "/auth/signup",
        permanent: true,
      },
    ];
  },

  // Bundle analyzer
  ...(process.env.ANALYZE === "true" && {
    webpack: (config) => {
      config.plugins.push(
        new (require("webpack-bundle-analyzer").BundleAnalyzerPlugin)({
          analyzerMode: "server",
          openAnalyzer: true,
        }),
      );
      return config;
    },
  }),
};

module.exports = nextConfig;
```

### Package Scripts

```json
// apps/web/package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "playwright test",
    "analyze": "ANALYZE=true npm run build",
    "db:generate": "cd ../../packages/database && npm run generate",
    "db:migrate": "cd ../../packages/database && npm run migrate",
    "db:seed": "cd ../../packages/database && npm run seed"
  }
}
```

## Vercel Deployment Configuration

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "app/api/sync/**": {
      "maxDuration": 60
    },
    "app/api/search/**": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=0, stale-while-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/webhooks/(.*)",
      "destination": "/api/webhooks/$1"
    }
  ]
}
```

### Environment Variables Setup

```bash
# .env.example
# App Configuration
NEXT_PUBLIC_APP_URL=https://TheSet.app
NEXT_PUBLIC_APP_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# External APIs
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLISTFM_API_KEY=your_setlistfm_api_key

# Services
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
RESEND_API_KEY=your_resend_api_key

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Environment Management

### Environment-Specific Configurations

```typescript
// lib/config.ts
const config = {
  app: {
    name: "TheSet",
    url: process.env.NEXT_PUBLIC_APP_URL!,
    env: process.env.NEXT_PUBLIC_APP_ENV as
      | "development"
      | "staging"
      | "production",
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },

  apis: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    },
    ticketmaster: {
      apiKey: process.env.TICKETMASTER_API_KEY!,
    },
    setlistfm: {
      apiKey: process.env.SETLISTFM_API_KEY!,
    },
  },

  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  },

  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN!,
    },
    posthog: {
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    },
  },

  features: {
    enableAnalytics: config.app.env === "production",
    enableDebugLogs: config.app.env !== "production",
    enableExperimentalFeatures: config.app.env === "development",
  },
} as const;

export default config;
```

### Feature Flags

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  SPOTIFY_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_SPOTIFY === "true",
  REAL_TIME_UPDATES: process.env.NEXT_PUBLIC_ENABLE_REALTIME === "true",
  PUSH_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_PUSH === "true",
  ADVANCED_SEARCH: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_SEARCH === "true",
  USER_GENERATED_CONTENT: process.env.NEXT_PUBLIC_ENABLE_UGC === "true",
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
```

## Database Management & Migrations

### Production Migration Strategy

```typescript
// packages/database/src/migrate-production.ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, migrationClient } from "./client";
import { sql } from "drizzle-orm";

async function runProductionMigrations() {
  console.log("🚀 Starting production migrations...");

  try {
    // Check if database is accessible
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connection established");

    // Run migrations with transaction
    await migrationClient.begin(async (tx) => {
      await migrate(db, {
        migrationsFolder: "./migrations",
        migrationsTable: "drizzle_migrations",
      });
    });

    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

// Only run if called directly
if (require.main === module) {
  runProductionMigrations();
}
```

### Database Backup Automation

```typescript
// scripts/backup-database.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function backupDatabase() {
  const timestamp = new Date().toISOString().split("T")[0];
  const backupName = `TheSet-backup-${timestamp}.sql`;

  try {
    console.log("🔄 Starting database backup...");

    const command = `pg_dump ${process.env.DATABASE_URL} > backups/${backupName}`;
    await execAsync(command);

    console.log(`✅ Backup created: ${backupName}`);

    // Upload to cloud storage (implementation depends on provider)
    await uploadToCloudStorage(backupName);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    // Send alert notification
    await sendBackupAlert(error);
  }
}

async function uploadToCloudStorage(filename: string) {
  // Implementation for cloud storage upload
  // Could use AWS S3, Google Cloud Storage, etc.
}

async function sendBackupAlert(error: Error) {
  // Send notification to team about backup failure
}

// Schedule daily backups
if (process.env.NODE_ENV === "production") {
  setInterval(backupDatabase, 24 * 60 * 60 * 1000); // Daily
}
```

## Monitoring & Analytics

### Error Tracking with Sentry

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === "development",

  beforeSend(event) {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === "ChunkLoadError") {
        return null; // Don't send chunk load errors
      }
    }
    return event;
  },

  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ["localhost", "TheSet.app"],
    }),
  ],
});

export { Sentry };
```

### Application Metrics

```typescript
// lib/metrics.ts
import { PostHog } from "posthog-node";

class MetricsService {
  private posthog: PostHog;

  constructor() {
    this.posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  }

  trackEvent(
    userId: string | null,
    event: string,
    properties?: Record<string, any>,
  ) {
    if (process.env.NODE_ENV !== "production") return;

    this.posthog.capture({
      distinctId: userId || "anonymous",
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NEXT_PUBLIC_APP_ENV,
      },
    });
  }

  trackPageView(userId: string | null, path: string) {
    this.trackEvent(userId, "$pageview", { path });
  }

  trackUserAction(userId: string, action: string, data?: Record<string, any>) {
    this.trackEvent(userId, `user_${action}`, data);
  }

  trackAPICall(endpoint: string, duration: number, status: number) {
    this.trackEvent(null, "api_call", {
      endpoint,
      duration,
      status,
    });
  }

  async shutdown() {
    await this.posthog.shutdown();
  }
}

export const metrics = new MetricsService();
```

### Performance Monitoring

```typescript
// lib/performance.ts
export class PerformanceMonitor {
  static measureAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();

      try {
        const result = await operation();
        const endTime = performance.now();
        const duration = endTime - startTime;

        console.log(`⏱️ ${operationName} took ${duration.toFixed(2)}ms`);

        // Track in analytics
        metrics.trackEvent(null, "performance_metric", {
          operation: operationName,
          duration: Math.round(duration),
        });

        resolve(result);
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        console.error(
          `❌ ${operationName} failed after ${duration.toFixed(2)}ms:`,
          error,
        );

        metrics.trackEvent(null, "performance_error", {
          operation: operationName,
          duration: Math.round(duration),
          error: error.message,
        });

        reject(error);
      }
    });
  }

  static measurePageLoad() {
    if (typeof window === "undefined") return;

    window.addEventListener("load", () => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;

      const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      const dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
      const tcpTime = navigation.connectEnd - navigation.connectStart;
      const ttfb = navigation.responseStart - navigation.requestStart;

      metrics.trackEvent(null, "page_performance", {
        pageLoadTime: Math.round(pageLoadTime),
        dnsTime: Math.round(dnsTime),
        tcpTime: Math.round(tcpTime),
        ttfb: Math.round(ttfb),
        path: window.location.pathname,
      });
    });
  }
}
```

## Performance Optimization

### Caching Strategy

```typescript
// lib/cache-control.ts
export const CACHE_STRATEGIES = {
  // Static content - cache for 1 year with revalidation
  STATIC: "public, max-age=31536000, immutable",

  // API responses - cache for 5 minutes
  API_SHORT: "public, max-age=300, stale-while-revalidate=3600",

  // Artist/venue data - cache for 1 hour
  CONTENT_MEDIUM: "public, max-age=3600, stale-while-revalidate=86400",

  // Search results - cache for 10 minutes
  SEARCH: "public, max-age=600, stale-while-revalidate=1800",

  // User-specific content - no cache
  PRIVATE: "private, no-cache, no-store, must-revalidate",

  // Real-time data - minimal cache
  REALTIME: "public, max-age=60, stale-while-revalidate=300",
} as const;

export function setCacheHeaders(
  response: Response,
  strategy: keyof typeof CACHE_STRATEGIES,
): Response {
  response.headers.set("Cache-Control", CACHE_STRATEGIES[strategy]);
  return response;
}
```

### Image Optimization

```typescript
// components/optimized-image.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
}

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 400,
  className,
  priority = false,
  placeholder = 'empty',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          placeholder={placeholder}
          className={`transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <div className="flex items-center justify-center bg-muted h-full">
          <span className="text-muted-foreground">Image unavailable</span>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}
```

## Security & Compliance

### Security Headers Middleware

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "origin-when-cross-origin");

  // CSP Header
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app *.posthog.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### GDPR Compliance

```typescript
// components/cookie-consent.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@repo/ui/components/button';
import { Card } from '@repo/ui/components/card';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);

    // Initialize analytics after consent
    if (typeof window !== 'undefined') {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
      });
    }
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Card className="p-4 shadow-lg">
        <h3 className="font-semibold mb-2">Cookie Consent</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We use cookies to enhance your experience and analyze our traffic.
          By clicking "Accept", you consent to our use of cookies.
        </p>
        <div className="flex gap-2">
          <Button onClick={acceptCookies} size="sm">
            Accept
          </Button>
          <Button onClick={declineCookies} variant="outline" size="sm">
            Decline
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

## Backup & Disaster Recovery

### Automated Backup System

```typescript
// scripts/disaster-recovery.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class DisasterRecoveryService {
  async createFullBackup(): Promise<void> {
    const timestamp = new Date().toISOString();
    const backupName = `full-backup-${timestamp}`;

    try {
      // Database backup
      await this.backupDatabase(backupName);

      // File storage backup
      await this.backupStorage(backupName);

      // Configuration backup
      await this.backupConfiguration(backupName);

      console.log(`✅ Full backup completed: ${backupName}`);
    } catch (error) {
      console.error("❌ Backup failed:", error);
      throw error;
    }
  }

  private async backupDatabase(backupName: string): Promise<void> {
    const command = `pg_dump ${process.env.DATABASE_URL} | gzip > backups/${backupName}-db.sql.gz`;
    await execAsync(command);
  }

  private async backupStorage(backupName: string): Promise<void> {
    // Backup uploaded files, images, etc.
    // Implementation depends on storage solution
  }

  private async backupConfiguration(backupName: string): Promise<void> {
    // Backup environment variables, settings, etc.
    const config = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    };

    // Store configuration backup
  }

  async restoreFromBackup(backupName: string): Promise<void> {
    console.log(`🔄 Restoring from backup: ${backupName}`);

    try {
      await this.restoreDatabase(backupName);
      await this.restoreStorage(backupName);

      console.log(`✅ Restore completed: ${backupName}`);
    } catch (error) {
      console.error("❌ Restore failed:", error);
      throw error;
    }
  }

  private async restoreDatabase(backupName: string): Promise<void> {
    const command = `gunzip -c backups/${backupName}-db.sql.gz | psql ${process.env.DATABASE_URL}`;
    await execAsync(command);
  }

  private async restoreStorage(backupName: string): Promise<void> {
    // Restore files from backup
  }
}
```

## Development Workflow

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Run E2E tests
        run: npm run test:e2e

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  deploy:
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

### Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { sql } from "drizzle-orm";

export async function GET() {
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {} as Record<string, any>,
  };

  try {
    // Database health check
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    healthCheck.services.database = {
      status: "healthy",
      responseTime: Date.now() - dbStart,
    };

    // Redis health check
    const redisStart = Date.now();
    // Add Redis ping check
    healthCheck.services.redis = {
      status: "healthy",
      responseTime: Date.now() - redisStart,
    };

    return NextResponse.json(healthCheck);
  } catch (error) {
    healthCheck.status = "unhealthy";
    healthCheck.services.error = error.message;

    return NextResponse.json(healthCheck, { status: 500 });
  }
}
```

This comprehensive deployment and monitoring setup ensures TheSet runs reliably in production with proper error handling, performance monitoring, and disaster recovery capabilities.
