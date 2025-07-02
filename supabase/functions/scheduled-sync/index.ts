// deno-lint-ignore-file no-explicit-any
// @ts-nocheck  Supabase Edge Runtime (Deno)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase    = createClient(supabaseUrl, serviceKey);

interface Payload {
  type?: 'all' | 'trending' | 'artists';
  limit?: number; // optional cap for batch jobs
}

async function syncPopularArtists(limit = 20) {
  const { error } = await supabase.functions.invoke('sync-artists', {
    body: { limit }
  });
  if (error) throw error;
}

async function updateTrending() {
  // Call existing update-trending edge function if present
  try {
    await supabase.functions.invoke('update-trending');
  } catch (_) {
    console.warn('update-trending function not deployed');
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { type = 'all', limit = 20 } = (await req.json()) as Payload;

  try {
    if (type === 'all' || type === 'artists') {
      await syncPopularArtists(limit);
    }

    if (type === 'all' || type === 'trending') {
      await updateTrending();
    }

    return new Response(
      JSON.stringify({ success: true, ran: type }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('scheduled-sync error', e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    );
  }
});