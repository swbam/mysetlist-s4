// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is provided
const sentryDsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Add comprehensive integrations for production monitoring
    integrations: [
      Sentry.replayIntegration({
        // Capture only errors and key user interactions
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
      Sentry.httpClientIntegration(),
      Sentry.browserTracingIntegration({
        // Track web vitals and performance
        enableInp: true,
        enableLongTask: true,
      }),
    ],

    // Performance monitoring configuration
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

    // Session replay configuration
    replaysSessionSampleRate: process.env['NODE_ENV'] === 'production' ? 0.05 : 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment and release tracking
    environment: process.env['NODE_ENV'] || 'development',
    release: process.env['VERCEL_GIT_COMMIT_SHA'] || 'unknown',

    // Enhanced error filtering and fingerprinting
    beforeSend: (event, hint) => {
      // Filter out development errors
      if (event.exception) {
        const error = hint.originalException;
        // Filter out common development errors
        if (error instanceof Error && error.message && error.message.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }
      }
      return event;
    },

    // Custom tags for better organization
    initialScope: {
      tags: {
        component: 'web-app',
        deployment: process.env['VERCEL_ENV'] || 'development',
      },
    },

    // Debug configuration
    debug: process.env['NODE_ENV'] === 'development',

    // Enable experimental features
    _experiments: {
      enableLogs: true,
    },

  });
} else if (process.env['NODE_ENV'] === 'development') {
  console.log('Sentry DSN not configured - monitoring disabled');
}
