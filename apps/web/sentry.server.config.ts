// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is provided
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Server-side integrations for comprehensive monitoring
    integrations: [
      Sentry.httpIntegration({
        tracing: true,
        breadcrumbs: true,
        instrumentOutgoingRequests: true,
      }),
      Sentry.nodeContextIntegration(),
      Sentry.localVariablesIntegration({
        captureAllExceptions: false,
        maxExceptionsPerSecond: 50,
      }),
    ],

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment and release tracking
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',

    // Enhanced error handling
    beforeSend: (event, hint) => {
      // Add server-side context
      if (event.request) {
        event.tags = {
          ...event.tags,
          server: 'nextjs',
          runtime: 'nodejs',
        };
      }

      // Filter out expected errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.message) {
          // Filter out common operational errors
          if (error.message.includes('ECONNRESET') || 
              error.message.includes('ENOTFOUND') ||
              error.message.includes('AbortError')) {
            return null;
          }
        }
      }

      return event;
    },

    // Custom tags for better organization
    initialScope: {
      tags: {
        component: 'web-server',
        deployment: process.env.VERCEL_ENV || 'development',
        region: process.env.VERCEL_REGION || 'unknown',
      },
    },

    // Debug configuration
    debug: process.env.NODE_ENV === 'development',

    // Advanced sampling for different types of events
    tracesSampler: (samplingContext) => {
      // Higher sampling for critical API routes
      if (samplingContext.request?.url?.includes('/api/')) {
        return process.env.NODE_ENV === 'production' ? 0.2 : 1.0;
      }
      
      // Lower sampling for static assets
      if (samplingContext.request?.url?.includes('/_next/')) {
        return 0.01;
      }
      
      // Default sampling
      return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
    },

    // Enable experimental features
    _experiments: {
      enableLogs: true,
    },
  });
} else if (process.env.NODE_ENV === 'development') {
  console.log('Sentry DSN not configured for server - monitoring disabled');
}
