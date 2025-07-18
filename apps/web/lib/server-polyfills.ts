// Server-side polyfills for browser globals
// Apply polyfills immediately when module loads
(() => {
  if (typeof globalThis !== 'undefined') {
    if (typeof globalThis.self === 'undefined') {
      (globalThis as any).self = globalThis;
    }
    if (typeof globalThis.window === 'undefined') {
      // Create a proper window-like object with location property to prevent destructuring errors
      (globalThis as any).window = {
        ...globalThis,
        location: {
          href: 'http://localhost:3001',
          protocol: 'http:',
          host: 'localhost:3001',
          hostname: 'localhost',
          port: '3001',
          pathname: '/',
          search: '',
          hash: '',
          origin: 'http://localhost:3001',
        },
      };
    }
  }

  if (typeof global !== 'undefined') {
    if (typeof global.self === 'undefined') {
      (global as any).self = global;
    }
    if (typeof global.window === 'undefined') {
      // Create a proper window-like object with location property to prevent destructuring errors
      (global as any).window = {
        ...global,
        location: {
          href: 'http://localhost:3001',
          protocol: 'http:',
          host: 'localhost:3001',
          hostname: 'localhost',
          port: '3001',
          pathname: '/',
          search: '',
          hash: '',
          origin: 'http://localhost:3001',
        },
      };
    }
  }

  // Also define self in the global scope
  if (typeof self === 'undefined') {
    (global as any).self = global;
  }
})();

export {};