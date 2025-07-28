// Simple wrapper for Supabase MCP functions to avoid import issues

export async function mcp__supabase__execute_sql(params: {
  project_id: string;
  query: string;
}) {
  // Import the MCP function dynamically to avoid server/client issues
  const { mcp__supabase__execute_sql: executeSql } = await import(
    "./mcp-functions"
  );
  return await executeSql(params);
}
