import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env['NEXT_PUBLIC_CONVEX_URL']!);

export function createClient() {
  return convex;
}

export { convex };