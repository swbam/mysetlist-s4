import { createHash } from "node:crypto";
import { db } from "@repo/database";
import { apiKeys } from "@repo/database";
import { and, eq, gte } from "drizzle-orm";

// Validate API key format
function isValidApiKeyFormat(key: string): boolean {
  return /^msl_[a-zA-Z0-9_-]{32}$/.test(key);
}

// Validate API key middleware
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  scopes?: string[];
  keyId?: string;
}> {
  if (!isValidApiKeyFormat(key)) {
    return { valid: false };
  }

  const hash = createHash("sha256").update(key).digest("hex");

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, hash),
        eq(apiKeys.isActive, true),
        gte(apiKeys.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!apiKey) {
    return { valid: false };
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return {
    valid: true,
    userId: apiKey.userId,
    scopes: apiKey.scopes,
    keyId: apiKey.id,
  };
}
