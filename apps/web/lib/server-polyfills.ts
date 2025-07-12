// Server-side polyfills for browser globals
// Apply polyfills immediately when module loads
(() => {
  if (typeof globalThis !== 'undefined') {
    if (typeof globalThis.self === 'undefined') {
      (globalThis as any).self = globalThis;
    }
    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = globalThis;
    }
  }

  if (typeof global !== 'undefined') {
    if (typeof global.self === 'undefined') {
      (global as any).self = global;
    }
    if (typeof global.window === 'undefined') {
      (global as any).window = global;
    }
  }

  // Also define self in the global scope
  if (typeof self === 'undefined') {
    (global as any).self = global;
  }
})();

export {};