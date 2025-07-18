import { log } from './log';

// Optional Sentry import
let captureException: ((error: unknown) => void) | undefined;
try {
  const sentry = require('@sentry/nextjs');
  captureException = sentry.captureException;
} catch {
  // Sentry not available, use fallback
  captureException = undefined;
}

export const parseError = (error: unknown): string => {
  let message = 'An error occurred';

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = error.message as string;
  } else {
    message = String(error);
  }

  try {
    // Only capture if Sentry is available
    if (captureException) {
      captureException(error);
    }
    log.error(`Parsing error: ${message}`);
  } catch (newError) {
    // biome-ignore lint/suspicious/noConsole: Need console here
    console.error('Error parsing error:', newError);
  }

  return message;
};
