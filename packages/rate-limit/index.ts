import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { keys } from './keys';
import { db, rateLimits, eq, and, sql } from '@repo/database';

// Initialize Supabase client lazily
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const env = keys();
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
};

export function createRateLimiter(options: {
  limit: number;
  window: string;
  prefix?: string;
}) {
  const { limit, window, prefix = 'rl' } = options;
  
  // Parse window string (e.g., "15 m", "1 h", "1 d")
  const parseWindow = (windowStr: string): number => {
    const parts = windowStr.split(' ');
    const value = parseFloat(parts[0] || '1');
    const unit = parts[1] || 's';
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return value * 1000;
    }
  };
  
  const windowMs = parseWindow(window);
  
  return {
    limit: async (identifier: string): Promise<RateLimitResult> => {
      const key = `${prefix}:${identifier}`;
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);
      
      try {
        // Try to use database rate limiting
        const [existing] = await db
          .select()
          .from(rateLimits)
          .where(
            and(
              eq(rateLimits.key, key),
              sql`${rateLimits.lastReset} > ${windowStart}`
            )
          )
          .limit(1);
        
        if (!existing) {
          // Create new rate limit entry
          await db.insert(rateLimits).values({
            key,
            count: 1,
            lastReset: now,
            windowMs,
          });
          
          return {
            success: true,
            limit,
            remaining: limit - 1,
            reset: new Date(now.getTime() + windowMs),
          };
        }
        
        if (existing.count >= limit) {
          // Rate limit exceeded
          return {
            success: false,
            limit,
            remaining: 0,
            reset: new Date(existing.lastReset.getTime() + windowMs),
          };
        }
        
        // Increment counter
        await db
          .update(rateLimits)
          .set({ count: existing.count + 1 })
          .where(eq(rateLimits.id, existing.id));
        
        return {
          success: true,
          limit,
          remaining: limit - existing.count - 1,
          reset: new Date(existing.lastReset.getTime() + windowMs),
        };
      } catch (error) {
        // Fallback to Supabase if database is not available
        console.warn('Database rate limiting failed, falling back to Supabase:', error);
        
        const supabase = getSupabaseClient();
        const { data, error: supabaseError } = await supabase.rpc('check_rate_limit', {
          p_key: key,
          p_limit: limit,
          p_window_ms: windowMs,
        });
        
        if (supabaseError) {
          console.error('Supabase rate limiting failed:', supabaseError);
          // Allow the request if rate limiting fails
          return {
            success: true,
            limit,
            remaining: limit,
            reset: new Date(now.getTime() + windowMs),
          };
        }
        
        return {
          success: data.allowed,
          limit,
          remaining: data.remaining,
          reset: new Date(data.reset_at),
        };
      }
    },
  };
}
