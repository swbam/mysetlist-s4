import { env } from "@repo/env";
import type { MetadataRoute } from "next";

const prodUrl = env.NEXT_PUBLIC_URL || env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
const url = new URL(prodUrl);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", url.href).href,
  };
}
