import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const setlistId = searchParams.get('setlistId');
  
  if (!setlistId) {
    return new Response('Missing setlistId', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', setlistId })}\n\n`);

      // Subscribe to real-time changes
      const subscription = supabase
        .channel(`setlist-votes-${setlistId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `setlist_song_id=in.(${setlistId})`
          },
          (payload) => {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'vote_update',
              payload: payload.new || payload.old,
              eventType: payload.eventType
            })}\n\n`);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'setlist_songs'
          },
          (payload) => {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'setlist_update',
              payload: payload.new || payload.old,
              eventType: payload.eventType
            })}\n\n`);
          }
        )
        .subscribe();

      // Cleanup function
      const cleanup = () => {
        subscription.unsubscribe();
        controller.close();
      };

      // Handle client disconnect
      request.signal?.addEventListener('abort', cleanup);
      
      // Keep connection alive
      const keepAlive = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
      }, 30000);

      // Cleanup when stream ends
      return () => {
        clearInterval(keepAlive);
        cleanup();
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
} 