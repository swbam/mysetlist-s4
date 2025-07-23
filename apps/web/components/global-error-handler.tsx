'use client';

import { useEffect } from 'react';

/**
 * Global error handler for unhandled promise rejections and runtime errors
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Prevent the default browser behavior (showing error in console)
      event.preventDefault();
      
      // Send to error tracking in production
      if (process.env['NODE_ENV'] === 'production') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `Unhandled Promise Rejection: ${event.reason}`,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            type: 'unhandledrejection',
          }),
        }).catch(() => {
          // Silently fail if error tracking fails
        });
      }
    };

    // Handle runtime errors
    const handleError = (event: ErrorEvent) => {
      console.error('Runtime error:', event.error);
      
      // Send to error tracking in production
      if (process.env['NODE_ENV'] === 'production') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `Runtime Error: ${event.message}`,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            type: 'error',
          }),
        }).catch(() => {
          // Silently fail if error tracking fails
        });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null; // This component doesn't render anything
}