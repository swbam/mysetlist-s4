import { env } from '@/env';
import type { MetadataRoute } from 'next';

const protocol = env.VERCEL_PROJECT_PRODUCTION_URL?.startsWith('https')
  ? 'https'
  : 'http';
const url = env.VERCEL_PROJECT_PRODUCTION_URL 
  ? new URL(`${protocol}://${env.VERCEL_PROJECT_PRODUCTION_URL}`)
  : new URL('http://localhost:3000');

const sitemap = async (): Promise<MetadataRoute.Sitemap> => [
  {
    url: new URL('/', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/artists', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/shows', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/venues', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/search', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/trending', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/about', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/privacy', url).href,
    lastModified: new Date(),
  },
  {
    url: new URL('/terms', url).href,
    lastModified: new Date(),
  },
];

export default sitemap;
