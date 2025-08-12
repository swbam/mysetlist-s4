import { env } from "@repo/env";
import type { MetadataRoute } from "next";

const prodUrl =
  env.NEXT_PUBLIC_URL || env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
const url = new URL(prodUrl);

const sitemap = async (): Promise<MetadataRoute.Sitemap> => [
  {
    url: new URL("/", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/artists", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/shows", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/venues", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/search", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/trending", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/about", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/privacy", url).href,
    lastModified: new Date(),
  },
  {
    url: new URL("/terms", url).href,
    lastModified: new Date(),
  },
];

export default sitemap;
