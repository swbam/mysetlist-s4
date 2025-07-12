// Enhanced Edge Runtime Sentry configuration for comprehensive monitoring
// This file configures Sentry for edge features (middleware, edge routes, and so on).
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is provided
const sentryDsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Enhanced edge runtime integrations
    integrations: [
      // Edge runtime has limited APIs, only include compatible integrations
      // httpIntegration is not available in the current Sentry version
    ],

    // Performance monitoring with adaptive sampling
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.05 : 1.0,

    // Environment and release tracking
    environment: process.env['NODE_ENV'] || 'development',
    release: process.env['VERCEL_GIT_COMMIT_SHA'] || 'unknown',

    // Enhanced error filtering for edge runtime
    beforeSend: (event, hint) => {
      // Filter out edge runtime specific errors that are not actionable
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error && error.message) {
          // Filter out edge runtime limitations
          if (
            error.message.includes('Dynamic code evaluation') ||
            error.message.includes('eval is not allowed') ||
            error.message.includes('Function constructor')
          ) {
            return null;
          }
        }
      }

      // Add edge runtime context
      event.tags = {
        ...event.tags,
        runtime: 'edge',
        environment: process.env['NODE_ENV'] || 'development',
      };

      return event;
    },

    // Enhanced breadcrumb filtering for edge runtime
    beforeBreadcrumb: (breadcrumb, _hint) => {
      // Filter out noisy edge runtime breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }

      return breadcrumb;
    },

    // Custom tags for edge runtime identification
    initialScope: {
      tags: {
        component: 'edge-runtime',
        deployment: process.env['VERCEL_ENV'] || 'development',
        runtime_type: 'edge',
      },
    },

    // Edge-specific sampling
    tracesSampler: (samplingContext) => {
      // Higher sampling for middleware and API routes
      if (samplingContext['request']?.url?.includes('/api/')) {
        return process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0;
      }
      
      // Lower sampling for static requests
      if (samplingContext['request']?.url?.includes('/_next/static/')) {
        return 0.01;
      }
      
      // Default sampling for edge runtime
      return process.env['NODE_ENV'] === 'production' ? 0.05 : 1.0;
    },

    // Debug configuration for edge runtime
    debug: process.env['NODE_ENV'] === 'development',

    // Enable experimental features compatible with edge runtime
    _experiments: {
      enableLogs: true,
    },
  });
} else if (process.env['NODE_ENV'] === 'development') {
  console.log('Sentry DSN not configured for edge runtime - monitoring disabled');
}
