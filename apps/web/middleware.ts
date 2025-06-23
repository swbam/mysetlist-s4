import { env } from '@/env';
import { authMiddleware } from '@repo/auth/middleware';
import { internationalizationMiddleware } from '@repo/internationalization/middleware';
import { parseError } from '@repo/observability/error';
import { secure } from '@repo/security';
import {
  noseconeMiddleware,
  noseconeOptions,
  noseconeOptionsWithToolbar,
} from '@repo/security/middleware';
import {
  type NextMiddleware,
  type NextRequest,
  NextResponse,
} from 'next/server';
import { updateSession } from './middleware/auth';

export const config = {
  // matcher tells Next.js which routes to run the middleware on. This runs the
  // middleware on all routes except for static assets and Posthog ingest
  matcher: ['/((?!_next/static|_next/image|ingest|favicon.ico).*)'],
};

// FLAGS_SECRET is not configured, use default nosecone options
const securityHeaders = noseconeMiddleware(noseconeOptions);

const middleware: NextMiddleware = async (request: NextRequest) => {
  // Update Supabase session
  await updateSession(request);

  // Apply auth middleware
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  // Apply internationalization middleware
  const i18nResponse = internationalizationMiddleware(request);
  if (i18nResponse) {
    return i18nResponse;
  }

  // Apply security headers
  return securityHeaders();
};

export default middleware;
