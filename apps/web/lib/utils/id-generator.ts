/**
 * SSR-safe ID generation utilities
 * These ensure consistent IDs between server and client renders
 */

// Global counter for unique IDs
let globalIdCounter = 0;

/**
 * Generate a stable sequential ID
 * Safe for SSR as it uses a deterministic approach
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${++globalIdCounter}`;
}

/**
 * Generate a client-safe ID with additional entropy
 * Only use when client-side uniqueness is critical
 */
export function generateClientId(prefix = 'client'): string {
  const timestamp = typeof window !== 'undefined' ? Date.now() : 0;
  const random = typeof window !== 'undefined' ? Math.random().toString(36).substr(2, 9) : 'ssr';
  return `${prefix}-${timestamp}-${random}-${++globalIdCounter}`;
}

/**
 * Reset the ID counter (useful for tests or specific scenarios)
 */
export function resetIdCounter(): void {
  globalIdCounter = 0;
}

/**
 * Generate a stable ID based on input parameters
 * Useful when you need deterministic IDs based on data
 */
export function generateStableId(...parts: (string | number)[]): string {
  return parts.join('-').replace(/[^a-zA-Z0-9-]/g, '-');
}

/**
 * Generate a hash-based ID from a string
 * Deterministic and safe for SSR
 */
export function generateHashId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hash-${Math.abs(hash)}`;
}