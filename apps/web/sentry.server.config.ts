// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is provided
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === "development",
    
    // Set environment
    environment: process.env.NODE_ENV || "development",

    // Enable Sentry Logs (Beta) - requires SDK version 9.17.0+
    _experiments: {
      enableLogs: true,
    },
  });
} else if (process.env.NODE_ENV === "development") {
  console.log("Sentry server config: DSN not provided, skipping initialization");
}
