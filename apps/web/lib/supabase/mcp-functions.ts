// Server-side Supabase operations using the service role
import { createSupabaseAdminClient } from '@repo/database';

export async function mcp__supabase__execute_sql(params: {
  project_id: string;
  query: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.rpc('execute_sql', {
    sql_query: params.query,
  });

  if (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }

  return data;
}
