// Database connectivity check utility
export async function checkDatabaseConnection() {
  const checks = {
    hasEnvVars: false,
    canImportPackage: false,
    canConnectToDb: false,
    error: null as any,
  };

  // Check 1: Environment variables
  checks.hasEnvVars = !!(
    process.env['DATABASE_URL'] &&
    process.env['NEXT_PUBLIC_SUPABASE_URL'] &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!checks.hasEnvVars) {
    checks.error = {
      message: "Missing required environment variables",
      details: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    };
    return checks;
  }

  try {
    // Check 2: Can import database package
    const dbModule = await import("@repo/database");
    checks.canImportPackage = true;

    // Check 3: Can execute a query
    if (dbModule.db && dbModule.sql) {
      await dbModule.db.execute(dbModule.sql`SELECT 1 as test`);
      checks.canConnectToDb = true;
    } else {
      checks.error = {
        message: "Database module imported but db instance is undefined",
      };
    }
  } catch (error: any) {
    checks.error = {
      message: error.message,
      code: error.code,
      stack: process.env['NODE_ENV'] === "development" ? error.stack : undefined,
    };
  }

  return checks;
}
