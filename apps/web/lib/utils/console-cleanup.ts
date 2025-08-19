/**
 * Production console cleanup utility
 * Removes console logs and warnings in production while preserving errors
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  debug: console.debug,
  trace: console.trace,
  group: console.group,
  groupCollapsed: console.groupCollapsed,
  groupEnd: console.groupEnd,
  table: console.table,
  time: console.time,
  timeEnd: console.timeEnd,
  count: console.count,
  clear: console.clear,
};

/**
 * Initialize console cleanup for production
 */
export function initConsoleCleanup() {
  // Only apply in production environment
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Silent no-op function for production
  const noop = () => {};

  // Override console methods in production
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
  console.trace = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.table = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.count = noop;
  console.clear = noop;

  // Keep console.error for critical errors
  // Keep console.assert for assertions
}

/**
 * Restore original console methods (useful for debugging in production)
 */
export function restoreConsole() {
  Object.assign(console, originalConsole);
}

/**
 * Development-only console wrapper
 */
export const devConsole = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      originalConsole.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      originalConsole.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      originalConsole.warn(...args);
    }
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      originalConsole.debug(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    originalConsole.error(...args);
  },
};

/**
 * Safe console wrapper that respects environment
 */
export const safeConsole = {
  log: devConsole.log,
  info: devConsole.info,
  warn: devConsole.warn,
  debug: devConsole.debug,
  error: devConsole.error,
};

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  initConsoleCleanup();
}