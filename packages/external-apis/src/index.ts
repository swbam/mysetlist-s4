// External API Clients
export * from './clients/spotify';
export * from './clients/ticketmaster';
export * from './clients/setlistfm';

// Sync Services
export * from './services';
export { SyncScheduler } from './services';

// Utilities
export * from './utils';

// Provide a default singleton instance for convenience and backwards compatibility
import { SyncScheduler } from './services';
export const syncScheduler = new SyncScheduler();