import { init } from '@sentry/nextjs';
import { keys } from './keys';

export const initializeSentry = () => {
  const sentryDsn = keys().NEXT_PUBLIC_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  const opts = {
    dsn: sentryDsn,
  };

  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    init(opts);
  }

  if (process.env['NEXT_RUNTIME'] === 'edge') {
    init(opts);
  }
};
