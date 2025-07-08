import { NextResponse } from 'next/server';

export async function GET() {
  const diagnostics: any = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasDbUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    database: {
      connected: false,
      error: null,
      tables: [],
    },
  };

  try {
    // Try to import the database module first
    const dbModule = await import('@repo/database');
    diagnostics.importedKeys = Object.keys(dbModule).sort();
    
    const { db, sql } = dbModule;
    
    if (!db) {
      diagnostics.database.error = 'Database instance is null';
      diagnostics.status = 'error';
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Log db properties for debugging
    if (process.env.NODE_ENV === 'development') {
      diagnostics.dbDebug = {
        type: typeof db,
        hasExecute: 'execute' in db,
        hasSelect: 'select' in db,
        constructor: db.constructor?.name,
      };
    }

    // Try a simple query
    const result = await db.execute(sql`SELECT current_database(), version()`);
    diagnostics.database.connected = true;
    diagnostics.database.info = result[0];

    // Check for tables
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    diagnostics.database.tables = tables.map((t: any) => t.tablename);

    diagnostics.status = 'healthy';
    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: any) {
    diagnostics.status = 'error';
    diagnostics.database.error = {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };

    // Check for specific error types
    if (error.message?.includes('DATABASE_URL')) {
      diagnostics.database.error.type = 'configuration';
      diagnostics.database.error.suggestion = 'Please set DATABASE_URL in your .env.local file';
    } else if (error.code === 'ECONNREFUSED') {
      diagnostics.database.error.type = 'connection';
      diagnostics.database.error.suggestion = 'Database server is not reachable';
    } else if (error.code === '28P01') {
      diagnostics.database.error.type = 'authentication';
      diagnostics.database.error.suggestion = 'Invalid database credentials';
    } else if (error.message?.includes('Symbol(drizzle:')) {
      diagnostics.database.error.type = 'drizzle-initialization';
      diagnostics.database.error.suggestion = 'Drizzle ORM initialization failed';
    }

    return NextResponse.json(diagnostics, { status: 500 });
  }
}