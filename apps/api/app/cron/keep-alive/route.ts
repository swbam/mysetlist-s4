import { db } from '@repo/database';

export const GET = async () => {
  // Simple health check that doesn't require database operations
  return new Response('OK', { status: 200 });
};
