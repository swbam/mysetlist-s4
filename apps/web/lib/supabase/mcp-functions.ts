// Server-side Supabase operations using the service role
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function mcp__supabase__execute_sql(params: {
  project_id: string;
  query: string;
}) {
  const { data, error } = await supabaseAdmin.rpc('execute_sql', {
    sql_query: params.query,
  });

  if (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }

  return data;
}
