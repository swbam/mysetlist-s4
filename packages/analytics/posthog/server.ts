import 'server-only';
import { PostHog } from 'posthog-node';
import { keys } from '../keys';

const posthogKey = keys().NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = keys().NEXT_PUBLIC_POSTHOG_HOST;

export const analytics = posthogKey ? new PostHog(posthogKey, {
  host: posthogHost,

  // Don't batch events and flush immediately - we're running in a serverless environment
  flushAt: 1,
  flushInterval: 0,
}) : null;
