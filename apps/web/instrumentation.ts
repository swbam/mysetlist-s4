// Temporarily disable edge instrumentation due to build issues
export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    try {
      await import('./sentry.server.config');
    } catch (error) {
      console.warn('Failed to load sentry.server.config:', error);
    }
  }

  // Temporarily disable edge runtime instrumentation
  // if (process.env['NEXT_RUNTIME'] === 'edge') {
  //   await import('./sentry.edge.config');
  // }
}
