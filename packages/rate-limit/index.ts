import { createClient } from '@supabase/supabase-js';
import { keys } from './keys';

const supabase = createClient(keys().SUPABASE_URL, keys().SUPABASE_ANON_KEY);

type RateLimiterProps = {
  limit: number;
  window: string;
  prefix?: string;
};

export const createRateLimiter = (props: RateLimiterProps) => {
  const max = props.limit;
  const windowMs = parseWindow(props.window);
  const prefix = props.prefix ?? 'next-forge';

  return {
    limit: async (identifier: string) => {
      const key = `${prefix}:${identifier}`;
      let data = await getRateLimit(key);
      const now = new Date().getTime();

      if (data) {
        if (now - new Date(data.last_reset).getTime() > windowMs) {
          data = { count: 0, last_reset: new Date(now) };
          await updateRateLimit(key, data);
        }

        if (data.count >= max) {
          return {
            success: false,
            limit: max,
            remaining: 0,
            reset: new Date(data.last_reset.getTime() + windowMs),
          };
        }

        data.count += 1;
        await updateRateLimit(key, data);

        return {
          success: true,
          limit: max,
          remaining: max - data.count,
          reset: new Date(data.last_reset.getTime() + windowMs),
        };
      } else {
        data = { count: 1, last_reset: new Date(now) };
        await insertRateLimit(key, data);

        return {
          success: true,
          limit: max,
          remaining: max - 1,
          reset: new Date(now + windowMs),
        };
      }
    },
  };
};

async function getRateLimit(key: string) {
  const { data, error } = await supabase
    .from('rate_limits')
    .select('count, last_reset')
    .eq('key', key)
    .single();

  if (error || !data) return null;
  return { count: data.count, last_reset: data.last_reset };
}

async function insertRateLimit(key: string, { count, last_reset }: { count: number; last_reset: Date }) {
  await supabase.from('rate_limits').insert({ key, count, last_reset });
}

async function updateRateLimit(key: string, { count, last_reset }: { count: number; last_reset: Date }) {
  await supabase.from('rate_limits').update({ count, last_reset }).eq('key', key);
}

function parseWindow(windowStr: string): number {
  const [value, unit] = windowStr.split(' ');
  const num = parseFloat(value);

  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60000;
    case 'h': return num * 3600000;
    case 'd': return num * 86400000;
    default: return num * 1000;
  }
}

export const slidingWindow = (limit: number, window: string) => ({ limit, window });
