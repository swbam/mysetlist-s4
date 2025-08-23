# Sentry Logging Integration

This application uses Sentry for centralized logging and error tracking, implementing the new **Sentry Logs API (Beta)** that was introduced in SDK version 9.17.0+. The integration follows the official Sentry documentation for Next.js applications.

## ✨ What's New

This implementation uses the latest Sentry Logs features:

- **Structured logging** with the new `logger` API
- **Enhanced log levels** including the new `trace` level
- **Better performance** with optimized log transmission
- **Integrated dashboard** experience in Sentry
- **Backward compatibility** with existing logging patterns

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```env
# Required
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Optional (for source map uploads)
SENTRY_AUTH_TOKEN=your_auth_token_here
```

### Sentry Configuration Files

- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.server.config.ts` - Server-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime Sentry configuration
- `instrumentation.ts` - Loads appropriate config based on runtime

## Logger Utility

The application provides a centralized logger utility at `lib/logger.ts` that integrates with Sentry.

### Usage Examples

#### Basic Logging

```typescript
import { logger } from "@/lib/logger";

// Trace level (new in Sentry Logs API)
logger.trace("Starting database connection", { database: "users" });

// Debug level
logger.debug("Debug message", { userId: "123", action: "user-login" });

// Info level
logger.info("User logged in successfully", { userId: "123" });

// Warning level (use 'warn' method)
logger.warn("API rate limit approaching", { remaining: 10 });

// Backward compatibility (warning method still works)
logger.warning("Legacy warning method", { data: "example" });

// Error level with error object
try {
  // some operation
} catch (error) {
  logger.error("Operation failed", error, { userId: "123" });
}

// Fatal level
logger.fatal("Critical system failure", error, { service: "database" });
```

#### User Context

```typescript
// Set user context (typically after authentication)
logger.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Clear user context (on logout)
logger.clearUser();
```

#### Breadcrumbs

```typescript
// Add breadcrumb for user action tracking
logger.addBreadcrumb("User clicked button", "ui", { buttonId: "submit" });
```

#### Performance Monitoring

```typescript
// Start a transaction
const transaction = logger.startTransaction("api-call", "http.server");

// Perform operation
await someAsyncOperation();

// End transaction
transaction.finish();
```

### Log Levels

- **trace**: Most detailed level for tracking execution flow (new in Sentry Logs API)
- **debug**: Detailed information for debugging (not sent in production by default)
- **info**: General informational messages
- **warn**: Warning messages that don't prevent operation (preferred over 'warning')
- **warning**: Legacy warning method (still supported for backward compatibility)
- **error**: Error messages for recoverable errors
- **fatal**: Critical errors that may cause system failure

### Context Object

The logger accepts an optional context object with any relevant data:

```typescript
interface LogContext {
  userId?: string;
  showId?: string;
  artistId?: string;
  venueId?: string;
  action?: string;
  [key: string]: any;
}
```

### New Sentry Logs Features

This implementation uses the new Sentry Logs API (Beta) which provides:

- **Structured logging**: Logs are sent as structured data to Sentry
- **Enhanced search**: Search logs by text content or attributes in Sentry dashboard
- **Better performance**: More efficient log transmission and processing
- **Integrated experience**: Logs appear alongside errors and performance data

The logger automatically:

- Filters debug logs in production
- Adds console logging in development
- Maintains backward compatibility with existing code

## Integration in API Routes

```typescript
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    logger.info("API endpoint called", {
      action: "get-data",
      endpoint: "/api/example",
    });

    // Your logic here

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("API endpoint failed", error, {
      action: "get-data-error",
      endpoint: "/api/example",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

## Integration in React Components

```typescript
'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function MyComponent() {
  useEffect(() => {
    logger.info('Component mounted', {
      component: 'MyComponent',
    });

    return () => {
      logger.info('Component unmounted', {
        component: 'MyComponent',
      });
    };
  }, []);

  const handleClick = () => {
    try {
      logger.info('Button clicked', {
        component: 'MyComponent',
        action: 'button-click',
      });

      // Your logic
    } catch (error) {
      logger.error('Button click failed', error, {
        component: 'MyComponent',
        action: 'button-click-error',
      });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

## Testing

### Test API Endpoint

Visit `/api/test-logger` to test logging functionality:

- `GET /api/test-logger` - Tests various log levels
- `GET /api/test-logger?error=true` - Simulates an error
- `POST /api/test-logger` - Tests POST request logging
- `POST /api/test-logger` with `{ triggerFatal: true }` - Tests fatal error

### Test Component

Use the `<LoggerExample />` component to test client-side logging.

## Best Practices

1. **Always include context**: Add relevant context to help with debugging
2. **Use appropriate log levels**: Don't use error for warnings or info for errors
3. **Log errors with error objects**: Pass the actual Error object for stack traces
4. **Set user context**: Always set user context after authentication
5. **Add breadcrumbs**: Track user actions leading up to errors
6. **Avoid logging sensitive data**: Never log passwords, tokens, or PII
7. **Use structured logging**: Use the context object instead of string concatenation

## Performance Considerations

- Debug logs are only sent to Sentry in development
- Sampling rates are lower in production to reduce overhead
- Use transactions sparingly for critical operations
- Batch related logs when possible

## Monitoring

Access your Sentry dashboard to:

- View real-time logs and errors
- Set up alerts for specific log patterns
- Analyze performance metrics
- Review user sessions with replay
- Track error trends over time
