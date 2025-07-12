import type { MetadataRoute } from 'next';
import { env } from '~/env';

const prodUrl = env["VERCEL_PROJECT_PRODUCTION_URL"] || 'localhost:3000';
const protocol = prodUrl.startsWith('https') ? 'https' : 'http';
const url = new URL(`${protocol}://${prodUrl}`);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: new URL('/sitemap.xml', url.href).href,
  };
}
