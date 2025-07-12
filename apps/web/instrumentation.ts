// Import server polyfills before anything else
import './lib/server-polyfills';

// Complete instrumentation for all runtimes with enhanced error handling
export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    try {
      await import('./sentry.server.config');
      console.log('✅ Sentry server instrumentation initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Sentry server instrumentation:', error);
    }
  }

  if (process.env['NEXT_RUNTIME'] === 'edge') {
    try {
      await import('./sentry.edge.config');
      console.log('✅ Sentry edge instrumentation initialized');
    } catch (error) {
      // Edge runtime has limited APIs, gracefully handle initialization failures
      console.warn('⚠️ Edge runtime Sentry initialization failed (expected in some environments):', error);
    }
  }

  // Initialize performance monitoring
  if (typeof globalThis !== 'undefined' && !(globalThis as any).__SENTRY_INSTRUMENTATION_INITIALIZED) {
    (globalThis as any).__SENTRY_INSTRUMENTATION_INITIALIZED = true;
    console.log('✅ Global instrumentation markers set');
  }
}
