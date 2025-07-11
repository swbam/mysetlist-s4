'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="mx-auto w-full max-w-md space-y-6 p-6 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>

            <div className="space-y-2">
              <h1 className="font-bold text-2xl text-gray-900">
                Application Error
              </h1>
              <p className="text-gray-600">
                Something went wrong with the application. Please try refreshing
                the page.
              </p>
            </div>

            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Reload application
            </button>

            {process.env['NODE_ENV'] === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-gray-500 text-sm hover:text-gray-700">
                  Error details (development only)
                </summary>
                <pre className="mt-2 overflow-auto rounded-md bg-gray-100 p-3 text-gray-800 text-xs">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
