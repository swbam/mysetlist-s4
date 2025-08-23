// Circuit Breaker Barrel Export
// Consolidates circuit breaker functionality to prevent duplicate implementations

// Re-export the primary circuit breaker implementation
export * from './services/circuit-breaker';

// Default export for convenience
export { CircuitBreaker as default } from './services/circuit-breaker';
