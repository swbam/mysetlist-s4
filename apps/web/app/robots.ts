import { env } from "@repo/env";
import type { MetadataRoute } from "next";

const prodUrl = env.VERCEL_PROJECT_PRODUCTION_URL || "localhost:3001";
const protocol = prodUrl.startsWith("https") ? "https" : "http";
const url = new URL(`${protocol}://${prodUrl}`);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", url.href).href,
  };
}
