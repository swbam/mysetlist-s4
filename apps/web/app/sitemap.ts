import type { MetadataRoute } from 'next';
import { env } from '@repo/env';

const prodUrl = env["VERCEL_PROJECT_PRODUCTION_URL"] || 'localhost:3001';
const protocol = prodUrl.startsWith('https') ? 'https' : 'http';
const url = new URL(`${protocol}://${prodUrl}`);

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
